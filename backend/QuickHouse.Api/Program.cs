using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;
using QuickHouse.Api.Data;
using QuickHouse.Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy
                .AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
            return;
        }

        policy
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var conn = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Database=quickhouse;User=root;Password=;";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseMySql(conn, ServerVersion.Parse("8.0.0-mysql"), b => b.MigrationsAssembly("QuickHouse.Api"));
});

builder.Services.AddHttpClient();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? "CHANGE_ME";
var jwtIssuer = jwtSection["Issuer"] ?? "QuickHouse";
var jwtAudience = jwtSection["Audience"] ?? "QuickHouse";
var jwtExpireMinutes = int.TryParse(jwtSection["ExpireMinutes"], out var minutes) ? minutes : 720;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanDelete", p =>
        p.RequireRole(SeedData.RoleAdmin, SeedData.RoleSuperAdmin));

    options.AddPolicy("CanAuditHouse", p =>
        p.RequireRole(SeedData.RoleAdmin, SeedData.RoleSuperAdmin));

    options.AddPolicy("CanManageRoles", p =>
        p.RequireRole(SeedData.RoleAdmin, SeedData.RoleSuperAdmin));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 确保 MySQL 数据库存在后再执行迁移（宿主机或容器内 MySQL 均无需手动建库）
static async Task EnsureDatabaseExistsAsync(string connectionString)
{
    var builder = new MySqlConnectionStringBuilder(connectionString);
    var database = builder.Database;
    if (string.IsNullOrEmpty(database)) return;

    builder.Database = "";
    using var connection = new MySqlConnection(builder.ConnectionString);
    await connection.OpenAsync();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = $"CREATE DATABASE IF NOT EXISTS `{database.Replace("`", "``")}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
    await cmd.ExecuteNonQueryAsync();
}

const int DbRetryCount = 5;
const int DbRetryDelaySeconds = 4;

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("QuickHouse.Startup");
    var csBuilder = new MySqlConnectionStringBuilder(conn);
    var serverInfo = $"{csBuilder.Server}:{csBuilder.Port}/{csBuilder.Database}";

    for (var attempt = 1; attempt <= DbRetryCount; attempt++)
    {
        try
        {
            await EnsureDatabaseExistsAsync(conn);
            await db.Database.MigrateAsync();
            await SeedData.SeedIfNeeded(db);
            logger.LogInformation("Database ready. Server={ServerInfo}", serverInfo);
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Database init attempt {Attempt}/{Total} failed. Server={ServerInfo}", attempt, DbRetryCount, serverInfo);
            if (attempt == DbRetryCount)
            {
                logger.LogError("Database init failed after {Total} attempts. Exiting. Server={ServerInfo}", DbRetryCount, serverInfo);
                throw;
            }
            await Task.Delay(TimeSpan.FromSeconds(DbRetryDelaySeconds));
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors();
app.UseStaticFiles();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsJsonAsync(ApiResponse<string>.Fail(500, "服务器异常"));
    }
});

app.UseAuthentication();
app.UseAuthorization();

static DateTime StartOfDay(DateTime dt) => new(dt.Year, dt.Month, dt.Day, 0, 0, 0, DateTimeKind.Local);

static async Task EnsureDailyEvents(AppDbContext db, DateTime dayLocal)
{
    var day = StartOfDay(dayLocal);
    var next = day.AddDays(1);

    var exists = await db.DailyEvents.AnyAsync(e => e.EventDate == day);
    if (exists) return;

    var houseCount = await db.Houses.CountAsync(h => h.ListedTime >= day && h.ListedTime < next);
    var newUserCount = await db.Users.CountAsync(u => u.AddedTime >= day && u.AddedTime < next);
    var signedCount = await db.Contracts.CountAsync(c => c.SignedAt >= day && c.SignedAt < next);
    var revenue = await db.Contracts
        .Where(c => c.SignedAt >= day && c.SignedAt < next)
        .SumAsync(c => (decimal?)c.ContractPrice) ?? 0m;

    db.DailyEvents.AddRange(
        new DailyEvent { EventDate = day, EventType = "HouseCount", Count = houseCount, CreatedAt = DateTime.Now },
        new DailyEvent { EventDate = day, EventType = "NewUserCount", Count = newUserCount, CreatedAt = DateTime.Now },
        new DailyEvent { EventDate = day, EventType = "SignedCount", Count = signedCount, CreatedAt = DateTime.Now },
        new DailyEvent { EventDate = day, EventType = "Revenue", Count = (int)revenue, CreatedAt = DateTime.Now }
    );
    await db.SaveChangesAsync();
}

app.MapGet("/api/health", async (AppDbContext db) =>
{
    try
    {
        await db.Database.CanConnectAsync();
        return Results.Ok(new { status = "ok" });
    }
    catch
    {
        return Results.Json(new { status = "unhealthy" }, statusCode: 503);
    }
});

app.MapGet("/api/houses", async (
    AppDbContext db,
    string? communityName,
    string? region,
    DateTime? listedFrom,
    DateTime? listedTo,
    decimal? minPrice,
    decimal? maxPrice,
    int page = 1,
    int pageSize = 10) =>
{
    var query = db.Houses.AsQueryable();

    if (!string.IsNullOrWhiteSpace(communityName))
    {
        query = query.Where(h => h.CommunityName.Contains(communityName));
    }

    if (!string.IsNullOrWhiteSpace(region))
    {
        query = query.Where(h => h.Location != null && h.Location.Contains(region));
    }

    if (listedFrom.HasValue)
    {
        query = query.Where(h => h.ListedTime >= listedFrom.Value);
    }

    if (listedTo.HasValue)
    {
        query = query.Where(h => h.ListedTime <= listedTo.Value);
    }

    if (minPrice.HasValue)
    {
        query = query.Where(h => h.Price >= minPrice.Value);
    }

    if (maxPrice.HasValue)
    {
        query = query.Where(h => h.Price <= maxPrice.Value);
    }

    var total = await query.CountAsync();

    var contractedIds = await db.Contracts.Select(c => c.HouseId).Distinct().ToListAsync();

    var list = await query
        .OrderByDescending(h => h.ListedTime)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    var items = list.Select(h => new
    {
        h.Id,
        h.CommunityName,
        h.HouseAge,
        h.Price,
        h.ListedTime,
        h.Images,
        h.Location,
        h.LandlordName,
        h.LandlordContact,
        h.AuditStatus,
        h.AuditRemark,
        h.Building,
        h.Unit,
        h.Floor,
        isContracted = contractedIds.Contains(h.Id)
    }).ToList();

    var result = new
    {
        total,
        page,
        pageSize,
        items
    };

    return Results.Ok(ApiResponse<object>.Success(result));
});

app.MapPost("/api/houses", async (AppDbContext db, House house) =>
{
    house.ListedTime = house.ListedTime == default ? DateTime.Now : house.ListedTime;
    db.Houses.Add(house);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<House>.Success(house));
});

app.MapPut("/api/houses/{id:int}", async (int id, AppDbContext db, House input) =>
{
    var house = await db.Houses.FindAsync(id);
    if (house is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "House not found"));
    }

    house.CommunityName = input.CommunityName;
    house.HouseAge = input.HouseAge;
    house.Price = input.Price;
    house.ListedTime = input.ListedTime;
    house.Images = input.Images;
    house.Location = input.Location;
    house.LandlordName = input.LandlordName;
    house.LandlordContact = input.LandlordContact ?? string.Empty;
    house.Building = input.Building;
    house.Unit = input.Unit;
    house.Floor = input.Floor;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<House>.Success(house));
});

app.MapPost("/api/uploads/houses", async (HttpRequest request) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(ApiResponse<string>.Fail(400, "invalid form"));
    }

    var form = await request.ReadFormAsync();
    var files = form.Files;
    if (files.Count == 0)
    {
        return Results.BadRequest(ApiResponse<string>.Fail(400, "no files"));
    }

    var root = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
    var dir = Path.Combine(root, "uploads", "houses");
    Directory.CreateDirectory(dir);

    var paths = new List<string>();
    foreach (var file in files)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not ".png" and not ".jpg" and not ".jpeg")
        {
            continue;
        }

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream);
        paths.Add($"/uploads/houses/{fileName}");
    }

    return Results.Ok(ApiResponse<object>.Success(new { paths }));
}).RequireAuthorization();

app.MapPut("/api/houses/{id:int}/audit", async (int id, AppDbContext db, HouseAuditRequest input) =>
{
    var house = await db.Houses.FindAsync(id);
    if (house is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "House not found"));
    }

    if (input.Status is not (0 or 1 or 2))
    {
        return Results.BadRequest(ApiResponse<string>.Fail(400, "invalid status"));
    }

    house.AuditStatus = input.Status;
    house.AuditRemark = input.Remark ?? string.Empty;
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<House>.Success(house));
}).RequireAuthorization("CanAuditHouse");

app.MapGet("/api/contracts", async (
    AppDbContext db,
    string? communityName,
    string? landlordName,
    string? tenantName,
    DateTime? signedFrom,
    DateTime? signedTo,
    int page = 1,
    int pageSize = 10) =>
{
    var query = db.Contracts.Include(c => c.House).AsQueryable();

    if (!string.IsNullOrWhiteSpace(communityName))
    {
        query = query.Where(c => c.CommunityName.Contains(communityName));
    }
    if (!string.IsNullOrWhiteSpace(landlordName))
    {
        query = query.Where(c => c.LandlordName.Contains(landlordName));
    }
    if (!string.IsNullOrWhiteSpace(tenantName))
    {
        query = query.Where(c => c.TenantName.Contains(tenantName));
    }
    if (signedFrom.HasValue)
    {
        query = query.Where(c => c.SignedAt >= signedFrom.Value);
    }
    if (signedTo.HasValue)
    {
        query = query.Where(c => c.SignedAt <= signedTo.Value);
    }

    var total = await query.CountAsync();

    var items = await query
        .OrderByDescending(c => c.SignedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(c => new
        {
            c.Id,
            c.CommunityName,
            c.LandlordName,
            c.LandlordContact,
            c.TenantName,
            c.TenantContact,
            c.Location,
            c.ContractPrice,
            houseInfo = $"{c.House.Building}-{c.House.Unit}-{c.House.Floor}",
            building = c.House.Building,
            unit = c.House.Unit,
            floor = c.House.Floor,
            houseImages = c.House.Images,
            c.SignedAt,
            c.HouseId
        })
        .ToListAsync();

    var result = new { total, page, pageSize, items };
    return Results.Ok(ApiResponse<object>.Success(result));
}).RequireAuthorization();

app.MapPost("/api/contracts", async (AppDbContext db, CreateContractRequest input) =>
{
    var house = await db.Houses.FindAsync(input.HouseId);
    if (house is null)
    {
        return Results.BadRequest(ApiResponse<string>.Fail(400, "House not found"));
    }

    var contract = new Contract
    {
        HouseId = house.Id,
        CommunityName = input.CommunityName,
        LandlordName = input.LandlordName,
        LandlordContact = input.LandlordContact,
        TenantName = input.TenantName,
        TenantContact = input.TenantContact,
        Location = input.Location,
        ContractPrice = input.ContractPrice,
        Building = house.Building,
        Unit = house.Unit,
        Floor = house.Floor,
        HouseImages = house.Images,
        SignedAt = input.SignedAt == default ? DateTime.Now : input.SignedAt
    };

    db.Contracts.Add(contract);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<object>.Success(new { contract.Id }));
}).RequireAuthorization();

app.MapPut("/api/contracts/{id:int}", async (int id, AppDbContext db, UpdateContractRequest input) =>
{
    var contract = await db.Contracts.FindAsync(id);
    if (contract is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "Contract not found"));
    }

    // 编辑签约时不允许修改关联房源、小区名称、位置，仅更新其余字段
    contract.LandlordName = input.LandlordName;
    contract.LandlordContact = input.LandlordContact;
    contract.TenantName = input.TenantName;
    contract.TenantContact = input.TenantContact;
    contract.ContractPrice = input.ContractPrice;
    contract.SignedAt = input.SignedAt;

    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<string>.Success("ok"));
}).RequireAuthorization();

app.MapDelete("/api/contracts/{id:int}", async (int id, AppDbContext db) =>
{
    var contract = await db.Contracts.FindAsync(id);
    if (contract is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "Contract not found"));
    }

    db.Contracts.Remove(contract);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<string>.Success("deleted"));
}).RequireAuthorization("CanDelete");

app.MapDelete("/api/houses/{id:int}", async (int id, AppDbContext db) =>
{
    var house = await db.Houses.FindAsync(id);
    if (house is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "House not found"));
    }

    db.Houses.Remove(house);
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<string>.Success("deleted"));
}).RequireAuthorization("CanDelete");

app.MapGet("/api/users/check", async (AppDbContext db, string? userName, int? excludeId) =>
{
    if (string.IsNullOrWhiteSpace(userName))
    {
        return Results.Ok(ApiResponse<object>.Success(new { exists = false }));
    }
    var exists = await db.Users.AnyAsync(u => u.UserName == userName.Trim() && (excludeId == null || u.Id != excludeId.Value));
    return Results.Ok(ApiResponse<object>.Success(new { exists }));
}).RequireAuthorization();

app.MapGet("/api/users", async (
    AppDbContext db,
    string? userName,
    DateTime? addedFrom,
    DateTime? addedTo,
    string? contact,
    int page = 1,
    int pageSize = 10) =>
{
    var query = db.Users.Include(u => u.Role).AsQueryable();

    if (!string.IsNullOrWhiteSpace(userName))
    {
        query = query.Where(u => u.UserName.Contains(userName));
    }

    if (addedFrom.HasValue)
    {
        query = query.Where(u => u.AddedTime >= addedFrom.Value);
    }

    if (addedTo.HasValue)
    {
        query = query.Where(u => u.AddedTime <= addedTo.Value);
    }

    if (!string.IsNullOrWhiteSpace(contact))
    {
        query = query.Where(u => u.Contact.Contains(contact));
    }

    var total = await query.CountAsync();

    var items = await query
        .OrderByDescending(u => u.AddedTime)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(u => new
        {
            u.Id,
            u.UserName,
            u.Gender,
            u.Contact,
            u.AddedTime,
            u.RoleId,
            roleName = u.Role != null ? u.Role.RoleName : null
        })
        .ToListAsync();

    var result = new
    {
        total,
        page,
        pageSize,
        items
    };

    return Results.Ok(ApiResponse<object>.Success(result));
});

app.MapPost("/api/users", async (AppDbContext db, CreateUserRequest input) =>
{
    var roleId = input.RoleId;
    if (roleId is null)
    {
        var staffRole = await db.Roles.FirstOrDefaultAsync(r => r.RoleName == SeedData.RoleStaff);
        roleId = staffRole?.Id;
    }

    var user = new User
    {
        UserName = input.UserName,
        PasswordHash = PasswordHelper.Hash(input.Password),
        Gender = input.Gender,
        Contact = input.Contact,
        AddedTime = DateTime.Now,
        RoleId = roleId,
        RealName = input.RealName
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<object>.Success(new
    {
        user.Id,
        user.UserName,
        user.Gender,
        user.Contact,
        user.AddedTime,
        user.RoleId,
        user.RealName
    }));
});

app.MapPut("/api/users/{id:int}", async (int id, AppDbContext db, UpdateUserRequest input) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "User not found"));
    }

    user.UserName = input.UserName;
    user.Gender = input.Gender;
    user.Contact = input.Contact;
    user.RealName = input.RealName;
    if (!string.IsNullOrWhiteSpace(input.Password))
    {
        if (PasswordHelper.Verify(input.Password, user.PasswordHash))
        {
            return Results.Ok(ApiResponse<string>.Fail(400, "新密码不能与旧密码相同"));
        }
        user.PasswordHash = PasswordHelper.Hash(input.Password);
    }

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<object>.Success(new
    {
        user.Id,
        user.UserName,
        user.Gender,
        user.Contact,
        user.AddedTime,
        user.RoleId,
        user.RealName
    }));
});

app.MapPut("/api/users/{id:int}/role", async (int id, AppDbContext db, UpdateUserRoleRequest input) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "User not found"));
    }

    var roleExists = await db.Roles.AnyAsync(r => r.Id == input.RoleId);
    if (!roleExists)
    {
        return Results.BadRequest(ApiResponse<string>.Fail(400, "Role not found"));
    }

    user.RoleId = input.RoleId;
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<string>.Success("ok"));
});

app.MapGet("/api/roles", async (
    AppDbContext db,
    string? roleName,
    DateTime? createFrom,
    DateTime? createTo) =>
{
    var query = db.Roles.AsQueryable();

    if (!string.IsNullOrWhiteSpace(roleName))
    {
        query = query.Where(r => r.RoleName.Contains(roleName));
    }

    if (createFrom.HasValue)
    {
        query = query.Where(r => r.CreateTime >= createFrom.Value);
    }

    if (createTo.HasValue)
    {
        query = query.Where(r => r.CreateTime <= createTo.Value);
    }

    var roles = await query
        .OrderBy(r => r.Id)
        .Select(r => new { r.Id, r.RoleName, r.Description, r.Permissions, r.CreateTime })
        .ToListAsync();
    return Results.Ok(ApiResponse<object>.Success(roles));
}).RequireAuthorization("CanManageRoles");

app.MapGet("/api/roles/check", async (AppDbContext db, string? roleName, int? excludeId) =>
{
    if (string.IsNullOrWhiteSpace(roleName))
    {
        return Results.Ok(ApiResponse<object>.Success(new { exists = false }));
    }
    var exists = await db.Roles.AnyAsync(r => r.RoleName == roleName.Trim() && (excludeId == null || r.Id != excludeId.Value));
    return Results.Ok(ApiResponse<object>.Success(new { exists }));
}).RequireAuthorization("CanManageRoles");

app.MapPost("/api/roles", async (AppDbContext db, CreateRoleRequest input) =>
{
    var exists = await db.Roles.AnyAsync(r => r.RoleName == (input.RoleName ?? "").Trim());
    if (exists)
    {
        return Results.Ok(ApiResponse<string>.Fail(400, "角色名称已存在"));
    }

    var role = new Role
    {
        RoleName = input.RoleName,
        Description = input.Description ?? string.Empty,
        Permissions = input.Permissions ?? string.Empty,
        CreateTime = DateTime.Now
    };
    db.Roles.Add(role);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<object>.Success(new { role.Id }));
}).RequireAuthorization("CanManageRoles");

app.MapPut("/api/roles/{id:int}", async (int id, AppDbContext db, UpdateRoleRequest input) =>
{
    var role = await db.Roles.FindAsync(id);
    if (role is null) return Results.NotFound(ApiResponse<string>.Fail(404, "Role not found"));

    var duplicate = await db.Roles.AnyAsync(r => r.RoleName == (input.RoleName ?? "").Trim() && r.Id != id);
    if (duplicate)
    {
        return Results.Ok(ApiResponse<string>.Fail(400, "角色名称已存在"));
    }

    role.RoleName = input.RoleName;
    role.Description = input.Description ?? string.Empty;
    role.Permissions = input.Permissions ?? string.Empty;
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<string>.Success("ok"));
}).RequireAuthorization("CanManageRoles");

app.MapDelete("/api/roles/{id:int}", async (int id, AppDbContext db) =>
{
    var role = await db.Roles.FindAsync(id);
    if (role is null) return Results.NotFound(ApiResponse<string>.Fail(404, "Role not found"));

    db.Roles.Remove(role);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<string>.Success("deleted"));
}).RequireAuthorization("CanManageRoles");

app.MapGet("/api/roles/{id:int}/members", async (int id, AppDbContext db) =>
{
    var members = await db.Users
        .Where(u => u.RoleId == id)
        .OrderBy(u => u.Id)
        .Select(u => new { u.Id, u.UserName, u.RealName })
        .ToListAsync();
    return Results.Ok(ApiResponse<object>.Success(members));
}).RequireAuthorization("CanManageRoles");

app.MapPut("/api/roles/{id:int}/members", async (int id, AppDbContext db, UpdateRoleMembersRequest input) =>
{
    var roleExists = await db.Roles.AnyAsync(r => r.Id == id);
    if (!roleExists) return Results.NotFound(ApiResponse<string>.Fail(404, "Role not found"));

    var staffRoleId = await db.Roles
        .Where(r => r.RoleName == SeedData.RoleStaff)
        .Select(r => (int?)r.Id)
        .FirstOrDefaultAsync();

    var targetUserIds = (input.UserIds ?? Array.Empty<int>()).Distinct().ToHashSet();

    // remove users not in list
    var toRemove = await db.Users.Where(u => u.RoleId == id && !targetUserIds.Contains(u.Id)).ToListAsync();
    foreach (var u in toRemove)
    {
        u.RoleId = staffRoleId;
    }

    // add users in list
    var toAdd = await db.Users.Where(u => targetUserIds.Contains(u.Id)).ToListAsync();
    foreach (var u in toAdd)
    {
        u.RoleId = id;
    }

    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<string>.Success("ok"));
}).RequireAuthorization("CanManageRoles");

app.MapGet("/api/auth/me", async (HttpContext ctx, AppDbContext db) =>
{
    var idRaw = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (!int.TryParse(idRaw, out var userId))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId);
    if (user is null) return Results.Unauthorized();

    return Results.Ok(ApiResponse<object>.Success(new
    {
        id = user.Id,
        userName = user.UserName,
        realName = user.RealName,
        contact = user.Contact,
        role = user.Role?.RoleName,
        permissions = user.Role?.Permissions ?? string.Empty
    }));
}).RequireAuthorization();

app.MapPut("/api/auth/profile", async (HttpContext ctx, AppDbContext db, UpdateProfileRequest input) =>
{
    var idRaw = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (!int.TryParse(idRaw, out var userId))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.FindAsync(userId);
    if (user is null) return Results.Unauthorized();

    user.RealName = input.RealName;
    if (input.Contact is not null)
    {
        user.Contact = input.Contact;
    }
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<string>.Success("ok"));
}).RequireAuthorization();

app.MapPut("/api/auth/change-password", async (HttpContext ctx, AppDbContext db, ChangePasswordRequest input) =>
{
    var idRaw = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (!int.TryParse(idRaw, out var userId))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.FindAsync(userId);
    if (user is null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(user.PasswordHash) || !PasswordHelper.Verify(input.OldPassword, user.PasswordHash))
    {
        return Results.Ok(ApiResponse<string>.Fail(400, "旧密码不正确"));
    }

    user.PasswordHash = PasswordHelper.Hash(input.NewPassword);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<string>.Success("ok"));
}).RequireAuthorization();

app.MapDelete("/api/users/{id:int}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "User not found"));
    }

    db.Users.Remove(user);
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<string>.Success("deleted"));
}).RequireAuthorization("CanDelete");

app.MapPost("/api/auth/login", async (AppDbContext db, LoginRequest request) =>
{
    var user = await db.Users
        .Include(u => u.Role)
        .FirstOrDefaultAsync(u => u.UserName == request.UserName);

    if (user is null)
    {
        return Results.Ok(ApiResponse<string>.Fail(401, "用户不存在"));
    }

    if (string.IsNullOrWhiteSpace(user.PasswordHash) || !PasswordHelper.Verify(request.Password, user.PasswordHash))
    {
        return Results.Ok(ApiResponse<string>.Fail(401, "密码错误"));
    }

    var roleName = user.Role?.RoleName ?? SeedData.RoleStaff;
    var permissions = user.Role?.Permissions ?? string.Empty;

    var claims = new List<Claim>
    {
        new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new(JwtRegisteredClaimNames.UniqueName, user.UserName),
        new(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new(ClaimTypes.Name, user.UserName),
        new(ClaimTypes.Role, roleName),
        new("permissions", permissions)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var expires = DateTime.UtcNow.AddMinutes(jwtExpireMinutes);
    var token = new JwtSecurityToken(
        issuer: jwtIssuer,
        audience: jwtAudience,
        claims: claims,
        expires: expires,
        signingCredentials: creds);

    var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

    var data = new
    {
        token = tokenString,
        user = new
        {
            id = user.Id,
            userName = user.UserName,
            realName = user.RealName,
            contact = user.Contact,
            role = roleName,
            permissions
        }
    };

    return Results.Ok(ApiResponse<object>.Success(data));
});

app.MapGet("/api/weather", async (IHttpClientFactory httpClientFactory, IConfiguration config, string? cityAdcode) =>
{
    var key = config["Amap:Key"];
    var city = cityAdcode ?? config["Amap:CityAdcode"] ?? "320500";
    if (string.IsNullOrWhiteSpace(key) || key.StartsWith("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Ok(ApiResponse<string>.Fail(500, "Amap Key not configured"));
    }

    var client = httpClientFactory.CreateClient();
    var baseUrl = "https://restapi.amap.com/v3/weather/weatherInfo";

    var liveUrl = $"{baseUrl}?key={Uri.EscapeDataString(key)}&city={Uri.EscapeDataString(city)}&extensions=base&output=JSON";
    var forecastUrl = $"{baseUrl}?key={Uri.EscapeDataString(key)}&city={Uri.EscapeDataString(city)}&extensions=all&output=JSON";

    var liveJson = await client.GetStringAsync(liveUrl);
    var forecastJson = await client.GetStringAsync(forecastUrl);

    return Results.Ok(ApiResponse<object>.Success(new { live = liveJson, forecast = forecastJson }));
}).RequireAuthorization();

app.MapGet("/api/stats/summary", async (AppDbContext db, DateTime? date) =>
{
    var target = date?.ToLocalTime() ?? DateTime.Now.AddDays(-1);
    var day = StartOfDay(target);
    await EnsureDailyEvents(db, day);

    var events = await db.DailyEvents.Where(e => e.EventDate == day).ToListAsync();
    int GetCount(string type) => events.FirstOrDefault(e => e.EventType == type)?.Count ?? 0;

    var data = new
    {
        date = day.ToString("yyyy-MM-dd"),
        houseCount = GetCount("HouseCount"),
        newUserCount = GetCount("NewUserCount"),
        signedCount = GetCount("SignedCount"),
        revenue = GetCount("Revenue")
    };

    return Results.Ok(ApiResponse<object>.Success(data));
}).RequireAuthorization();

app.MapGet("/api/stats/series", async (AppDbContext db, DateTime from, DateTime to) =>
{
    var start = StartOfDay(from.ToLocalTime());
    var end = StartOfDay(to.ToLocalTime());
    if (end < start) return Results.Ok(ApiResponse<string>.Fail(400, "invalid range"));

    // ensure yesterday at least
    await EnsureDailyEvents(db, DateTime.Now.AddDays(-1));

    var events = await db.DailyEvents
        .Where(e => e.EventDate >= start && e.EventDate <= end)
        .ToListAsync();

    var dates = Enumerable.Range(0, (end - start).Days + 1)
        .Select(i => start.AddDays(i))
        .ToList();

    int GetFor(DateTime d, string type) => events.FirstOrDefault(e => e.EventDate == d && e.EventType == type)?.Count ?? 0;

    var data = new
    {
        dates = dates.Select(d => d.ToString("yyyy-MM-dd")).ToArray(),
        houseCount = dates.Select(d => GetFor(d, "HouseCount")).ToArray(),
        newUserCount = dates.Select(d => GetFor(d, "NewUserCount")).ToArray(),
        signedCount = dates.Select(d => GetFor(d, "SignedCount")).ToArray(),
        revenue = dates.Select(d => GetFor(d, "Revenue")).ToArray()
    };

    return Results.Ok(ApiResponse<object>.Success(data));
}).RequireAuthorization();

app.MapGet("/api/stats/series-by-hour", async (AppDbContext db, DateTime? date) =>
{
    var dayLocal = (date ?? DateTime.Now).ToLocalTime();
    var dayStart = StartOfDay(dayLocal);

    var hours = Enumerable.Range(0, 24).Select(h => $"{h:D2}").ToArray();
    var houseCount = new int[24];
    var newUserCount = new int[24];
    var signedCount = new int[24];
    var revenue = new decimal[24];

    for (var h = 0; h < 24; h++)
    {
        var hourStart = dayStart.AddHours(h);
        var hourEnd = hourStart.AddHours(1);
        houseCount[h] = await db.Houses.CountAsync(x => x.ListedTime >= hourStart && x.ListedTime < hourEnd);
        newUserCount[h] = await db.Users.CountAsync(x => x.AddedTime >= hourStart && x.AddedTime < hourEnd);
        var contractsInHour = await db.Contracts
            .Where(c => c.SignedAt >= hourStart && c.SignedAt < hourEnd)
            .ToListAsync();
        signedCount[h] = contractsInHour.Count;
        revenue[h] = contractsInHour.Sum(c => c.ContractPrice);
    }

    var data = new
    {
        date = dayStart.ToString("yyyy-MM-dd"),
        hours,
        houseCount,
        newUserCount,
        signedCount,
        revenue = revenue.Select(x => (int)x).ToArray()
    };

    return Results.Ok(ApiResponse<object>.Success(data));
}).RequireAuthorization();

app.Run();

record LoginRequest(string UserName, string Password);

record HouseAuditRequest(int Status, string? Remark);

record CreateUserRequest(string UserName, string Password, string Gender, string Contact, int? RoleId, string? RealName);

record UpdateUserRequest(string UserName, string? Password, string Gender, string Contact, string? RealName);

record UpdateUserRoleRequest(int RoleId);

record UpdateProfileRequest(string? RealName, string? Contact);

record ChangePasswordRequest(string OldPassword, string NewPassword);

record CreateRoleRequest(string RoleName, string? Description, string? Permissions);

record UpdateRoleRequest(string RoleName, string? Description, string? Permissions);

record UpdateRoleMembersRequest(int[]? UserIds);

record CreateContractRequest(
    int HouseId,
    string CommunityName,
    string LandlordName,
    string LandlordContact,
    string TenantName,
    string TenantContact,
    string Location,
    decimal ContractPrice,
    DateTime SignedAt);

record UpdateContractRequest(
    int HouseId,
    string CommunityName,
    string LandlordName,
    string LandlordContact,
    string TenantName,
    string TenantContact,
    string Location,
    decimal ContractPrice,
    DateTime SignedAt);
