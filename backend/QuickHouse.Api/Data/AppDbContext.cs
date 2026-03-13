using Microsoft.EntityFrameworkCore;
using QuickHouse.Api.Models;

namespace QuickHouse.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<House> Houses => Set<House>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<DailyEvent> DailyEvents => Set<DailyEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasOne(u => u.Role)
             .WithMany(r => r.Users)
             .HasForeignKey(u => u.RoleId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Contract>(e =>
        {
            e.HasOne(c => c.House)
             .WithMany()
             .HasForeignKey(c => c.HouseId)
             .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
