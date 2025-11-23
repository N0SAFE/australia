"use client";

import React from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  Row,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { flexRender, useReactTable } from "@tanstack/react-table";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCapsules, useDeleteCapsule, useCapsuleVideoProcessing } from "@/hooks/capsules/hooks";
import { Capsule } from "@/types/capsule";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@repo/ui/components/shadcn/pagination";
import { Input } from "@repo/ui/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  Eye,
  Pencil,
  Search,
  Filter,
  MessageSquare,
  Lock,
  Unlock,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/shadcn/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, CalendarIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCapsule } from "@/hooks/capsules/hooks";
import type { Value } from "platejs";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { CapsuleContent } from "@/components/pages/capsule-details";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { TipTapContentRenderer } from "@/components/tiptap/common";
import { JSONContent } from "@repo/ui/tiptap-exports/react";
import { orpc } from "@/lib/orpc";
import { withFileUploads } from "@/lib/orpc/withFileUploads";
import { useCapsuleMedia } from "@/hooks/capsules/media";

// Create Capsule Dialog Component
function CreateCapsuleDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    openingMessage: "",
    isLocked: false,
  });
  
  // Default empty Tiptap value (proper doc structure)
  const getEmptyValue = () => ({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

  const [editorValue, setEditorValue] = useState<any>(getEmptyValue());
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  // Use media tracking hook
  const { processContentForSubmit } = useCapsuleMedia();

  const { mutate: createCapsule, isPending } = useCreateCapsule();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content
    if (!editorValue || editorValue.length === 0) {
      toast.error("Content is required");
      return;
    }

    if (!date) {
      toast.error("Opening date is required");
      return;
    }

    // Process content: extract local nodes, convert to uniqueId strategy, collect files
    const contentArray = Array.isArray(editorValue) ? editorValue : [editorValue];
    const { processedContent, media } = processContentForSubmit(contentArray);

    // Create capsule with processed content + media
    // Note: Explicitly convert boolean to ensure proper multipart/form-data handling
    createCapsule(
      {
        openingDate: date.toISOString(),
        content: JSON.stringify(processedContent),
        openingMessage: formData.openingMessage || undefined,
        isLocked: Boolean(formData.isLocked), // Explicit boolean conversion
        media,
      },
      {
        onSuccess: () => {
          // Toast notification is handled by the hook
          setOpen(false);
          // Reset form
          setEditorValue(getEmptyValue());
          setDate(undefined);
          setFormData({
            openingMessage: "",
            isLocked: false,
          });
        },
        // Error notification is handled by the hook
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2 shadow-sm hover:shadow-md transition-shadow"
        >
          <Plus className="h-4 w-4" />
          Create Capsule
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[90vw] sm:max-w-4xl p-0 gap-0 overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-lg sm:text-2xl">
                  Create New Time Capsule
                </SheetTitle>
                <SheetDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                  Preserve a moment in time with rich content that will be
                  revealed later.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Separator />

          <div className="flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="space-y-4 sm:space-y-6 max-w-full">
              {/* Content Editor Section */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-muted">
                    <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor="content"
                      className="text-sm sm:text-base font-semibold"
                    >
                      Capsule Content
                    </Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Add text, images, videos, audio, and more
                    </p>
                  </div>
                </div>
                <div 
                  className="border rounded-lg overflow-hidden"
                  role="region"
                  aria-label="Contenu de la capsule"
                  tabIndex={0}
                >
                  {!isEditorReady && (
                    <div className="p-4 space-y-3 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-5/6"></div>
                    </div>
                  )}
                  <div className={!isEditorReady ? 'hidden' : ''}>
                    <TipTapContentRenderer
                      mode="editor"
                      value={editorValue}
                      onChange={(newValue) => {
                        console.log(
                          "📝 [TipTap] Content changed:",
                          JSON.stringify(newValue, null, 2),
                        );
                        setEditorValue(newValue);
                      }}
                      capsule={undefined}
                      placeholder="Écrivez le contenu de votre capsule temporelle..."
                      onEditorReady={() => {
                        console.log("✅ [TipTap] Editor is ready");
                        setIsEditorReady(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Opening Date Section */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label
                      htmlFor="openingDate"
                      className="text-sm sm:text-base font-semibold"
                    >
                      Opening Date
                    </Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      When should this capsule be revealed?
                    </p>
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!date}
                      className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
                    >
                      <CalendarIcon />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      onSelect={setDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Opening Message Section */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-muted">
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor="openingMessage"
                      className="text-sm sm:text-base font-semibold"
                    >
                      Opening Message
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-normal ml-2">
                        (Optional)
                      </span>
                    </Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      A special greeting when the capsule opens
                    </p>
                  </div>
                </div>
                <Textarea
                  id="openingMessage"
                  placeholder="Welcome to this moment from the past..."
                  value={formData.openingMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, openingMessage: e.target.value })
                  }
                  className="min-h-16 sm:min-h-20 resize-none shadow-sm text-sm"
                />
              </div>

              <Separator />

              {/* Lock Status Section */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-muted">
                    {formData.isLocked ? (
                      <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm sm:text-base font-semibold">
                      Security Settings
                    </Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Control when this capsule can be accessed
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4 shadow-sm bg-muted/30 gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full shrink-0",
                        formData.isLocked ? "bg-primary/10" : "bg-muted",
                      )}
                    >
                      {formData.isLocked ? (
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      ) : (
                        <Unlock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium leading-none">
                        {formData.isLocked
                          ? "Locked until opening date"
                          : "Accessible anytime"}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                        {formData.isLocked
                          ? "Capsule will remain sealed until the scheduled opening date"
                          : "Capsule can be viewed immediately after creation"}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    pressed={formData.isLocked}
                    onPressedChange={(pressed) =>
                      setFormData({ ...formData, isLocked: pressed })
                    }
                    aria-label="Toggle lock status"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                  >
                    {formData.isLocked ? (
                      <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Toggle>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <SheetFooter className="px-4 py-3 sm:px-6 sm:py-4 bg-muted/30">
            <div className="flex w-full gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 sm:flex-none h-9 sm:h-10 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 sm:flex-none gap-2 shadow-sm h-9 sm:h-10 text-sm"
              >
                {isPending ? (
                  <>
                    <span className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Create Capsule
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const columnHelper = createColumnHelper<Capsule>();

const columns = [
  columnHelper.accessor("id", {
    id: "id",
    header: "Id",
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("content", {
    id: "content",
    header: "content",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("openingDate", {
    header: "Opening Date",
    cell: (info) => {
      const date = new Date(info.getValue());
      const now = new Date();
      const isUpcoming = date > now;
      return (
        <div className="text-sm">
          <div className="font-medium">{date.toLocaleDateString()}</div>
          <div
            className={cn(
              "text-xs",
              isUpcoming
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground",
            )}
          >
            {isUpcoming
              ? `In ${Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`
              : "Past"}
          </div>
        </div>
      );
    },
    enableSorting: true,
  }),
  columnHelper.accessor("openingMessage", {
    header: "Opening Message",
    cell: (info) => {
      const message = info.getValue();
      if (!message)
        return (
          <span className="text-muted-foreground italic text-xs">
            No message
          </span>
        );
      return <span className="text-sm max-w-xs truncate block">{message}</span>;
    },
  }),
  columnHelper.accessor("isLocked", {
    header: "Lock Status",
    cell: (info) => {
      const isLocked = info.getValue();
      return (
        <span
          className={cn(
            "py-1 px-2.5 text-xs rounded-md font-semibold inline-flex items-center gap-1.5",
            isLocked
              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
              : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
          )}
        >
          <span>{isLocked ? "🔒" : "🔓"}</span>
          <span>{isLocked ? "Locked" : "Unlocked"}</span>
        </span>
      );
    },
    enableSorting: true,
  }),
  columnHelper.display({
    id: "hasProcessingVideos",
    header: "Processing",
    cell: (info) => {
      const capsule = info.row.original as Capsule & { 
        hasProcessingVideos?: boolean;
        processingProgress?: number; 
        processingVideoCount?: number;
      };
      
      // Check if capsule has videos
      const hasVideos = capsule.attachedMedia?.some(media => media.type === 'video') ?? false;
      
      // If no videos at all, show "No videos"
      if (!hasVideos) {
        return (
          <span className="text-muted-foreground text-xs italic">
            No videos
          </span>
        );
      }
      
      // If has videos but not processing, show success badge
      if (!capsule.hasProcessingVideos) {
        return (
          <span
            className="py-1 px-2.5 text-xs rounded-md font-semibold inline-flex items-center gap-1.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
            title="All videos processed"
          >
            <span>✓</span>
            <span>Processed</span>
          </span>
        );
      }
      
      const progress = capsule.processingProgress ?? 0;
      const videoCount = capsule.processingVideoCount ?? 0;
      
      return (
        <span
          className="py-1 px-2.5 text-xs rounded-md font-semibold inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
          title={`Processing ${videoCount} video${videoCount !== 1 ? 's' : ''}`}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{progress}%</span>
        </span>
      );
    },
    enableSorting: false,
  }),
  columnHelper.accessor("createdAt", {
    header: "Created At",
    cell: (info) => {
      const date = new Date(info.getValue());
      return (
        <div className="text-sm">
          <div className="font-medium">{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString()}
          </div>
        </div>
      );
    },
    enableSorting: true,
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (props) => {
      return <RowActions row={props.row} />;
    },
  }),
];

const RowActions = ({ row }: { row: Row<Capsule> }) => {
  const { mutate: deleteCapsule, isPending: isDeleting } = useDeleteCapsule();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const capsuleId = row.getValue("id") as string;
  const openingDate = new Date(row.original.openingDate).toLocaleDateString();

  const handleDelete = () => {
    deleteCapsule(
      { id: capsuleId },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 px-2">
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full sm:w-[90vw] sm:max-w-4xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Capsule Preview</SheetTitle>
            <SheetDescription>Opening: {openingDate}</SheetDescription>
          </SheetHeader>
          <CapsuleContent data={row.original} />
        </SheetContent>
      </Sheet>
      <Link
        href={`/admin/capsules/${capsuleId}`}
        className="p-2 hover:bg-accent rounded-md transition-colors"
        title="View details"
      >
        <Eye className="h-4 w-4" />
      </Link>
      <Link
        href={`/admin/capsules/${capsuleId}/edit`}
        className="p-2 hover:bg-accent rounded-md transition-colors"
        title="Edit capsule"
      >
        <Pencil className="h-4 w-4" />
      </Link>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete capsule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Capsule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this capsule (opening:{" "}
              <strong>{openingDate}</strong>)? This action cannot be undone and
              all associated content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/**
 * Wrapper component that subscribes to video processing events for a capsule
 */
function CapsuleRowWithProcessing({ row }: { row: Row<Capsule> }) {
  const capsule = row.original as Capsule & { hasProcessingVideos?: boolean };
  
  // Extract video file IDs from attached media
  const videoFileIds = useMemo(() => {
    return capsule.attachedMedia
      ?.filter(media => media.type === 'video')
      ?.map(media => media.fileId) || [];
  }, [capsule.attachedMedia]);
  
  // Always subscribe if capsule has videos (not just when hasProcessingVideos is true)
  // This allows us to catch processing that starts after initial load
  const { isProcessing, overallProgress, processingCount } = useCapsuleVideoProcessing(
    capsule.id,
    videoFileIds,
    {
      enabled: videoFileIds.length > 0,
    }
  );
  
  // Show processing indicator with progress if processing
  const displayCapsule = {
    ...capsule,
    // Override hasProcessingVideos with real-time status
    hasProcessingVideos: isProcessing,
    // Add progress info for display
    processingProgress: overallProgress,
    processingVideoCount: processingCount,
  };
  
  return (
    <TableRow key={row.id}>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, { ...cell.getContext(), row: { ...row, original: displayCapsule } })}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function AdminCapsulesPageClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchMessage, setSearchMessage] = useState("");
  const [filterLockStatus, setFilterLockStatus] = useState<string>("all");

  // Fetch capsules with current state
  const {
    data: response,
    isLoading,
    error,
  } = useCapsules({
    pagination: {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    sort: sorting[0]
      ? {
          field: sorting[0].id as "openingDate" | "createdAt",
          direction: sorting[0].desc ? "desc" : "asc",
        }
      : undefined,
    // No polling needed - using SSE subscriptions for real-time updates
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const rawData = response?.capsules || [];

  // Apply client-side filters
  const data = useMemo(() => {
    return rawData.filter((capsule) => {
      const matchesMessage =
        !searchMessage ||
        capsule.openingMessage
          ?.toLowerCase()
          .includes(searchMessage.toLowerCase());
      const matchesLockStatus =
        filterLockStatus === "all" ||
        (filterLockStatus === "locked" ? capsule.isLocked : !capsule.isLocked);
      return matchesMessage && matchesLockStatus;
    });
  }, [rawData, searchMessage, filterLockStatus]);

  const totalItems = response?.meta?.pagination?.total || 0;
  const pageCount = Math.ceil(totalItems / pagination.pageSize);

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const showPages = 5; // Number of page buttons to show

    if (pageCount <= showPages) {
      for (let i = 1; i <= pageCount; i++) {
        pages.push(i);
      }
    } else {
      const current = pagination.pageIndex + 1;
      const start = Math.max(1, current - 2);
      const end = Math.min(pageCount, current + 2);

      if (start > 1) pages.push(1);
      if (start > 2) pages.push("ellipsis");

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < pageCount - 1) pages.push("ellipsis");
      if (end < pageCount) pages.push(pageCount);
    }

    return pages;
  }, [pageCount, pagination.pageIndex]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility: {
        id: false,
        content: false,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  if (error) {
    return (
      <div className="p-5 text-red-500">
        Error loading capsules: {error.message}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Capsules Management</h2>
          <CreateCapsuleDialog />
        </div>
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${totalItems} total capsules`}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by opening message..."
              value={searchMessage}
              onChange={(e) => {
                setSearchMessage(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Select
              value={filterLockStatus}
              onValueChange={(value) => {
                setFilterLockStatus(value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="pl-9">
                <SelectValue placeholder="Filter by lock status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lock Status</SelectItem>
                <SelectItem value="locked">🔒 Locked</SelectItem>
                <SelectItem value="unlocked">🔓 Unlocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[180px]">
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                setPagination((prev) => ({
                  ...prev,
                  pageSize: parseInt(value),
                  pageIndex: 0,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <Table>
        <TableCaption>A list of all time capsules in the system.</TableCaption>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <CapsuleRowWithProcessing key={row.id} row={row} />
          ))}
        </TableBody>
        <TableFooter>
          {table.getFooterGroups().map((footerGroup) => {
            return (
              <TableRow key={footerGroup.id}>
                {footerGroup.headers.map((header) => (
                  <TableCell key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.footer,
                          header.getContext(),
                        )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableFooter>
      </Table>
      {/* Pagination with shadcn component */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          {data.length === 0
            ? 0
            : pagination.pageIndex * pagination.pageSize + 1}{" "}
          to{" "}
          {Math.min(
            (pagination.pageIndex + 1) * pagination.pageSize,
            totalItems,
          )}{" "}
          of {totalItems} capsules
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                size="default"
                onClick={() => {
                  if (table.getCanPreviousPage()) {
                    table.previousPage();
                  }
                }}
                className={cn(
                  !table.getCanPreviousPage() &&
                    "pointer-events-none opacity-50",
                  "cursor-pointer",
                )}
              />
            </PaginationItem>

            {pageNumbers.map((page, idx) => (
              <PaginationItem key={`${page}-${idx}`}>
                {page === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    size="default"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        pageIndex: page - 1,
                      }))
                    }
                    isActive={pagination.pageIndex === page - 1}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                size="default"
                onClick={() => {
                  if (table.getCanNextPage()) {
                    table.nextPage();
                  }
                }}
                className={cn(
                  !table.getCanNextPage() && "pointer-events-none opacity-50",
                  "cursor-pointer",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
