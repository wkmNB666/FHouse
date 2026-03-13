using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuickHouse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseAuditRemark : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AuditRemark",
                table: "Houses",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AuditRemark",
                table: "Houses");
        }
    }
}
