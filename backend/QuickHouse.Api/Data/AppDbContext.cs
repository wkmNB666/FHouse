using Microsoft.EntityFrameworkCore;
using QuickHouse.Api.Models;

namespace QuickHouse.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<House> Houses => Set<House>();

    public DbSet<User> Users => Set<User>();
}

