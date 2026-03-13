using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using QuickHouse.Api.Models;

namespace QuickHouse.Api.Data;

public static class PasswordHelper
{
    public static string Hash(string password)
    {
        var bytes = Encoding.UTF8.GetBytes(password);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }

    public static bool Verify(string password, string hash)
    {
        var computed = Hash(password);
        return string.Equals(computed, hash, StringComparison.Ordinal);
    }
}

public static class SeedData
{
    public const string RoleSuperAdmin = "最高管理员";
    public const string RoleAdmin = "管理员";
    public const string RoleStaff = "普通业务员";

    public const string PermissionsAll = "HomeModule,HouseModule,UserModule,RoleModule,ContractModule";

    public static async Task SeedIfNeeded(AppDbContext db)
    {
        if (await db.Roles.AnyAsync())
            return;

        var superAdmin = new Role
        {
            RoleName = RoleSuperAdmin,
            Description = "拥有所有模块权限",
            Permissions = PermissionsAll,
            CreateTime = DateTime.Now
        };
        var admin = new Role
        {
            RoleName = RoleAdmin,
            Description = "可删除、审核、管理角色与签约",
            Permissions = PermissionsAll,
            CreateTime = DateTime.Now
        };
        var staff = new Role
        {
            RoleName = RoleStaff,
            Description = "仅添加与查看房源、查看自身信息",
            Permissions = "HomeModule,HouseModule",
            CreateTime = DateTime.Now
        };
        db.Roles.AddRange(superAdmin, admin, staff);
        await db.SaveChangesAsync();

        var adminUser = new User
        {
            UserName = "admin",
            PasswordHash = PasswordHelper.Hash("wkm112233"),
            Gender = "",
            Contact = "",
            AddedTime = DateTime.Now,
            RoleId = superAdmin.Id
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();
    }
}
