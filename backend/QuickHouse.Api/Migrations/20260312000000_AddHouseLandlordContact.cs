using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuickHouse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseLandlordContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LandlordContact",
                table: "Houses",
                type: "longtext",
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LandlordContact",
                table: "Houses");
        }
    }
}
