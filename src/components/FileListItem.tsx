// src/components/FileListItem.tsx
import {
  List,
  ActionPanel,
  Action,
  Alert,
  Icon,
  Color,
  confirmAlert,
  showToast,
  Toast,
  openCommandPreferences,
} from "@raycast/api";
import { MarkdownFile, MAX_VISIBLE_TAGS } from "../types/markdownTypes";
import { openWithEditor, moveToTrash } from "../utils/fileOperations";
import { isSystemTag, getSystemTag, sortTags } from "../utils/tagOperations";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { showFailureToast } from "@raycast/utils";
import { formatDate } from "../utils/dateUtils";
import { getTagTintColor } from "../utils/tagColorUtils";

interface FileListItemProps {
  file: MarkdownFile;
  showColorTags: boolean;
  setShowColorTags: (show: boolean) => void;
  revalidate: () => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  markdownDir: string;
  loadMoreFiles: () => void;
  showCreateFileForm: () => void;
  showTagSearchList: () => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

export function FileListItem({
  file,
  showColorTags,
  setShowColorTags,
  revalidate,
  currentPage,
  totalPages,
  setCurrentPage,
  markdownDir,
  loadMoreFiles,
  showCreateFileForm,
  showTagSearchList,
  selectedTag,
  setSelectedTag,
}: FileListItemProps) {
  // Confirm and delete file
  const confirmDelete = async () => {
    if (
      await confirmAlert({
        title: "Delete this file?",
        message: `Are you sure you want to delete "${file.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        fs.unlinkSync(file.path);
        showToast({
          style: Toast.Style.Success,
          title: "File deleted",
          message: `${file.name} has been deleted`,
        });
        revalidate();
      } catch (error) {
        showFailureToast({
          title: "Error deleting file",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  // Move file to trash using Raycast's trash API
  const handleMoveToTrash = async () => {
    try {
      const success = await moveToTrash(file.path);
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "File moved to trash",
          message: `${file.name} has been moved to trash`,
        });
        revalidate();
      } else {
        throw new Error("Failed to move file to trash");
      }
    } catch (error) {
      showFailureToast({
        title: "Error moving file to trash",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Get the relative path from the markdownDir
  const getRelativePath = () => {
    if (!markdownDir) return file.path;
    try {
      return path.relative(markdownDir, file.path);
    } catch (error) {
      return file.path;
    }
  };

  // Pagination actions
  const paginationActions = (
    <>
      {currentPage > 0 && (
        <Action
          title="Previous Page"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={() => setCurrentPage(currentPage - 1)}
        />
      )}
      {currentPage < totalPages - 1 && (
        <Action
          title="Next Page"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={() => setCurrentPage(currentPage + 1)}
        />
      )}
    </>
  );

  // Sort tags with system tags first
  const sortedTags = sortTags(file.tags);

  // Limit visible tags
  const visibleTags = sortedTags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagsCount = sortedTags.length - visibleTags.length;

  // Create a Date object from the timestamp for the tooltip
  const lastModifiedDate = new Date(file.lastModified);

  return (
    <List.Item
      id={file.path}
      title={file.name}
      subtitle={getRelativePath()}
      accessories={[
        {
          text: formatDate(file.lastModified),
          tooltip: `Last modified: ${lastModifiedDate.toLocaleString()}`,
        },
        ...visibleTags.map((tag) => {
          const systemTag = getSystemTag(tag);
          const isSystem = isSystemTag(tag);

          return {
            tag: {
              value: tag,
              color: showColorTags && isSystem ? getTagTintColor(isSystem, systemTag) : undefined,
            },
          };
        }),
        ...(hiddenTagsCount > 0
          ? [
              {
                tag: {
                  value: `+${hiddenTagsCount}`,
                  color: Color.SecondaryText,
                },
                tooltip: `${hiddenTagsCount} more tags: ${sortedTags.slice(MAX_VISIBLE_TAGS).join(", ")}`,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open with Editor" icon={Icon.BlankDocument} onAction={() => openWithEditor(file.path)} />
            <Action
              title="Open in Default App"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => {
                exec(`open "${file.path}"`);
              }}
            />
            <Action.OpenWith path={file.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
            <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={file.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Create a New Markdown File"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={showCreateFileForm}
            />
            <Action
              title="Refresh List"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
            <Action
              title="Load More Files"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={loadMoreFiles}
            />
          </ActionPanel.Section>

          {/* Add Tag Management Section */}
          <ActionPanel.Section>
            <Action
              title="Browse Tags"
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={showTagSearchList}
            />
            {selectedTag && (
              <Action
                title="Clear Tag Filter"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => setSelectedTag(null)}
              />
            )}
            <Action
              title={showColorTags ? "Hide Colored Tags" : "Show Colored Tags"}
              icon={showColorTags ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => setShowColorTags(!showColorTags)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Move to Trash"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleMoveToTrash}
            />
            <Action
              title="Delete File"
              icon={Icon.DeleteDocument}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "cmd"], key: "x" }}
              onAction={confirmDelete}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={openCommandPreferences}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>{paginationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
