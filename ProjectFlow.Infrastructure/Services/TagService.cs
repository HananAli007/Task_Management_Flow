using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Tags;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class TagService : ITagService
{
    private readonly AppDbContext _context;

    public TagService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TagResponseDto>> GetAllAsync()
    {
        return await _context.Tags
            .OrderBy(t => t.Name)
            .Select(t => new TagResponseDto { Id = t.Id, Name = t.Name })
            .ToListAsync();
    }

    public async Task<TagResponseDto> CreateAsync(CreateTagDto input)
    {
        var existing = await _context.Tags.FirstOrDefaultAsync(t => t.Name.ToLower() == input.Name.ToLower());
        if (existing != null) return new TagResponseDto { Id = existing.Id, Name = existing.Name };

        var tag = new Tag { Name = input.Name };
        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();

        return new TagResponseDto { Id = tag.Id, Name = tag.Name };
    }

    public async Task<List<TagResponseDto>> GetByTaskAsync(Guid taskId)
    {
        return await _context.TaskTags
            .Where(tt => tt.TaskId == taskId)
            .Select(tt => new TagResponseDto { Id = tt.Tag.Id, Name = tt.Tag.Name })
            .ToListAsync();
    }


    public async Task<bool> AssignToTaskAsync(Guid taskId, List<string> tagNames)
    {
        var task = await _context.TaskItems.Include(t => t.TaskTags).FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null) return false;

        // Remove existing tags
        _context.TaskTags.RemoveRange(task.TaskTags);

        foreach (var name in tagNames)
        {
            var tagName = name.Trim();
            if (string.IsNullOrEmpty(tagName)) continue;

            // Find or create tag
            var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name.ToLower() == tagName.ToLower());
            if (tag == null)
            {
                tag = new Tag { Name = tagName };
                _context.Tags.Add(tag);
                await _context.SaveChangesAsync(); // Save to get the ID
            }

            _context.TaskTags.Add(new TaskTag { TaskId = taskId, TagId = tag.Id });
        }

        await _context.SaveChangesAsync();
        return true;
    }
}
