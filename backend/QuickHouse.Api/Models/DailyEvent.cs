namespace QuickHouse.Api.Models;

/// <summary>Daily event for statistics (e.g. HouseCount, NewUserCount).</summary>
public class DailyEvent
{
    public int Id { get; set; }

    /// <summary>Date in yyyy-MM-dd.</summary>
    public DateTime EventDate { get; set; }

    /// <summary>e.g. HouseCount, NewUserCount, SignedCount, Revenue.</summary>
    public string EventType { get; set; } = string.Empty;

    public int Count { get; set; }

    public DateTime CreatedAt { get; set; }
}
