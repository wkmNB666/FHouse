using Microsoft.EntityFrameworkCore;
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

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                          ?? "Data Source=quickhouse.db";
    options.UseSqlite(connectionString);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
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

app.MapGet("/api/houses", async (
    AppDbContext db,
    string? communityName,
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

    var items = await query
        .OrderByDescending(h => h.ListedTime)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
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

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<House>.Success(house));
});

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
});

app.MapGet("/api/users", async (
    AppDbContext db,
    string? userName,
    DateTime? addedFrom,
    DateTime? addedTo,
    string? contact,
    int page = 1,
    int pageSize = 10) =>
{
    var query = db.Users.AsQueryable();

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

app.MapPost("/api/users", async (AppDbContext db, User user) =>
{
    user.AddedTime = user.AddedTime == default ? DateTime.Now : user.AddedTime;
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Ok(ApiResponse<User>.Success(user));
});

app.MapPut("/api/users/{id:int}", async (int id, AppDbContext db, User input) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null)
    {
        return Results.NotFound(ApiResponse<string>.Fail(404, "User not found"));
    }

    user.UserName = input.UserName;
    user.Gender = input.Gender;
    user.Contact = input.Contact;
    user.AddedTime = input.AddedTime;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<User>.Success(user));
});

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
});

app.MapPost("/api/auth/login", (LoginRequest request) =>
{
    if (request.UserName == "admin" && request.Password == "123456")
    {
        var data = new { userName = "admin" };
        return Results.Ok(ApiResponse<object>.Success(data));
    }

    return Results.Ok(ApiResponse<string>.Fail(401, "invalid credentials"));
});

app.Run();

record LoginRequest(string UserName, string Password);
