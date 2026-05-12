
using Microsoft.EntityFrameworkCore;
using ProjectFlow.Infrastructure.Data;
using System;
using System.Linq;

// This is a scratch script to verify Task data mapping
var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseSqlServer("Server=.;Database=Task_Management_System;Trusted_Connection=True;TrustServerCertificate=True;")
    .Options;

using (var context = new AppDbContext(options))
{
    var task = context.TaskItems.FirstOrDefault(t => t.Title.Contains("SAP"));
    if (task != null)
    {
        Console.WriteLine($"Task: {task.Title}");
        Console.WriteLine($"Status ID: {task.Status}");
        Console.WriteLine($"Project ID: {task.ProjectId}");
        
        var column = context.BoardColumns.FirstOrDefault(c => c.Id.ToString() == task.Status);
        if (column != null)
        {
            Console.WriteLine($"Found Column: {column.Title}");
            Console.WriteLine($"Column SystemStatus: {column.SystemStatus}");
        }
        else
        {
            Console.WriteLine("Column NOT FOUND for ID: " + task.Status);
        }
    }
    else
    {
        Console.WriteLine("SAP Task not found.");
    }
}
