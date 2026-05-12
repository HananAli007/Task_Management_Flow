using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAttachmentSystemToEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM Attachments;");
            migrationBuilder.Sql("DELETE FROM Subtasks;");

            migrationBuilder.RenameColumn(
                name: "EntityType",
                table: "Attachments",
                newName: "SourceType");

            migrationBuilder.RenameColumn(
                name: "EntityId",
                table: "Attachments",
                newName: "UploaderId");

            migrationBuilder.AddColumn<Guid>(
                name: "AssigneeId",
                table: "Subtasks",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatorId",
                table: "Subtasks",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "CommentId",
                table: "Attachments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "Attachments",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceId",
                table: "Attachments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Subtasks_AssigneeId",
                table: "Subtasks",
                column: "AssigneeId");

            migrationBuilder.CreateIndex(
                name: "IX_Subtasks_CreatorId",
                table: "Subtasks",
                column: "CreatorId");

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_CommentId",
                table: "Attachments",
                column: "CommentId");

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_UploaderId",
                table: "Attachments",
                column: "UploaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_AspNetUsers_UploaderId",
                table: "Attachments",
                column: "UploaderId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Comments_CommentId",
                table: "Attachments",
                column: "CommentId",
                principalTable: "Comments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Subtasks_AspNetUsers_AssigneeId",
                table: "Subtasks",
                column: "AssigneeId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Subtasks_AspNetUsers_CreatorId",
                table: "Subtasks",
                column: "CreatorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_AspNetUsers_UploaderId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Comments_CommentId",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Subtasks_AspNetUsers_AssigneeId",
                table: "Subtasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Subtasks_AspNetUsers_CreatorId",
                table: "Subtasks");

            migrationBuilder.DropIndex(
                name: "IX_Subtasks_AssigneeId",
                table: "Subtasks");

            migrationBuilder.DropIndex(
                name: "IX_Subtasks_CreatorId",
                table: "Subtasks");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_CommentId",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_UploaderId",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "AssigneeId",
                table: "Subtasks");

            migrationBuilder.DropColumn(
                name: "CreatorId",
                table: "Subtasks");

            migrationBuilder.DropColumn(
                name: "CommentId",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "FileSize",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "SourceId",
                table: "Attachments");

            migrationBuilder.RenameColumn(
                name: "UploaderId",
                table: "Attachments",
                newName: "EntityId");

            migrationBuilder.RenameColumn(
                name: "SourceType",
                table: "Attachments",
                newName: "EntityType");
        }
    }
}
