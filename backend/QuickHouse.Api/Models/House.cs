namespace QuickHouse.Api.Models;

public class House
{
    public int Id { get; set; }

    public string CommunityName { get; set; } = string.Empty;

    public int HouseAge { get; set; }

    public decimal Price { get; set; }

    public DateTime ListedTime { get; set; }

    /// <summary>Comma-separated or JSON paths for uploaded images.</summary>
    public string Images { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string LandlordName { get; set; } = string.Empty;

    /// <summary>房东联系方式，签约时联动回显</summary>
    public string LandlordContact { get; set; } = string.Empty;

    /// <summary>0=未审核, 1=已通过, 2=未通过</summary>
    public int AuditStatus { get; set; }

    public string AuditRemark { get; set; } = string.Empty;

    public string Building { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string Floor { get; set; } = string.Empty;
}
