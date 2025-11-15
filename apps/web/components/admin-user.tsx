'use client';

import { createColumnHelper, getCoreRowModel, Row, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { flexRender, useReactTable } from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { User, UserListResponse } from '@/types/user';
import { cn } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@repo/ui/components/shadcn/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Eye, Pencil, Search, Plus, Copy, CheckCircle2, MoreHorizontal, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/shadcn/dropdown-menu';
import { authClient } from '@/lib/auth';
import { toast } from 'sonner';
import { orpc } from '@/lib/orpc';

const columnHelper = createColumnHelper<User>()

function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'sarah'>('sarah');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const generateInvite = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      setIsGenerating(true);
      const result = await orpc.invitation.create.call({
        email,
        role,
      });
      
      if (result.success && result.token) {
        setInviteCode(result.token);
        toast.success('Invitation code generated successfully');
      } else {
        toast.error('Failed to generate invitation code');
      }
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error('Failed to generate invitation code');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      toast.success('Invitation link copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteCode('');
    setEmail('');
    setRole('sarah');
    setIsCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Generate an invitation code that allows a user to create their account.
            The invitation will expire in 7 days.
          </DialogDescription>
        </DialogHeader>
        
        {!inviteCode ? (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium mb-2 block">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Enter the email address for the invited user. They will use this email to create their account.
              </p>
            </div>
            
            <div>
              <label htmlFor="role" className="text-sm font-medium mb-2 block">
                User Role
              </label>
              <Select value={role} onValueChange={(value) => setRole(value as typeof role)} disabled={isGenerating}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full system access</SelectItem>
                  <SelectItem value="sarah">Sarah - Limited access (no /admin)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Assign a role to control what the user can access.
              </p>
            </div>
            
            <Button onClick={generateInvite} disabled={isGenerating || !email}>
              {isGenerating ? 'Generating...' : 'Generate Invitation Code'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Invitation Code</label>
              <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                {inviteCode}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Invitation Link</label>
              <div className="p-3 bg-muted rounded-md text-sm break-all">
                {window.location.origin}/invite/{inviteCode}
              </div>
            </div>
            
            <Button onClick={copyToClipboard} variant="outline" className="gap-2">
              {isCopied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Invitation Link
                </>
              )}
            </Button>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {inviteCode ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns = [
  columnHelper.accessor('id', {
    id: 'id',
    header: 'Id',
    cell: info => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => {
      const status = info.row.original.invitationStatus;
      const isPending = status === 'pending' || status === 'expired';
      const name = info.getValue();
      
      return (
        <span className="font-medium">
          {name}
          {isPending && (
            <span className="ml-2 text-xs text-muted-foreground italic">(Invitation)</span>
          )}
        </span>
      );
    },
    enableSorting: true,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: info => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
    enableSorting: true,
    enableColumnFilter: true,
  }),
  columnHelper.accessor('roles', {
    header: 'Roles',
    cell: info => {
      const roles = info.getValue();
      if (!roles || roles.length === 0) {
        return <span className="text-muted-foreground italic text-xs">No roles</span>;
      }
      return <span className="flex gap-1.5 flex-wrap">
        {roles.map(r => {
          return <span key={r} className={cn(
            "py-1 px-2.5 text-xs rounded-md font-semibold",
            r === 'admin' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
            r === 'user' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
            r === 'content' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
          )}>
            {r}
          </span>
        })}
      </span>;
    },
    enableSorting: false,
  }),
  columnHelper.accessor('invitationStatus', {
    header: 'Invitation Status',
    cell: info => {
      const status = info.getValue();
      const token = info.row.original.invitationToken;
      
      const copyInviteLink = async () => {
        if (!token) return;
        const inviteUrl = `${window.location.origin}/invite/${token}`;
        try {
          await navigator.clipboard.writeText(inviteUrl);
          toast.success('Invitation link copied to clipboard');
        } catch (error) {
          toast.error('Failed to copy to clipboard');
        }
      };

      if (!status) {
        return <span className="text-muted-foreground italic text-xs">Not invited</span>;
      }

      return (
        <div className="flex items-center gap-2">
          <span className={cn(
            "py-1 px-2.5 text-xs rounded-md font-semibold",
            status === 'accepted' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
            status === 'pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
            status === 'expired' && 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200',
          )}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {status === 'pending' && token && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copyInviteLink} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Show invitation link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
    },
    enableSorting: false,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created At',
    cell: info => {
      const date = new Date(info.getValue());
      return (
        <div className="text-sm">
          <div className="font-medium">{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
        </div>
      );
    },
    enableSorting: true,
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated At',
    cell: info => {
      const date = new Date(info.getValue());
      return (
        <div className="text-sm">
          <div className="font-medium">{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
        </div>
      );
    },
    enableSorting: true,
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: props => {
      return <RowActions row={props.row}/>;
    },
  }),
]

const RowActions = ({
  row,
}: {
  row: Row<User>,
}) => {
  const status = row.original.invitationStatus;
  const isPendingInvitation = (status === 'pending' || status === 'expired') && !row.original.emailVerified;
  
  if (isPendingInvitation) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground italic">No actions available</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/users/${row.getValue('id')}`}
        className="p-2 hover:bg-accent rounded-md transition-colors"
        title="View details"
      >
        <Eye className="h-4 w-4" />
      </Link>
      <Link
        href={`/admin/users/${row.getValue('id')}/edit`}
        className="p-2 hover:bg-accent rounded-md transition-colors"
        title="Edit user"
      >
        <Pencil className="h-4 w-4" />
      </Link>
    </div>
  )
}
export function AdminUsersPage() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchName, setSearchName] = useState('')
  const [searchEmail, setSearchEmail] = useState('')

  // Fetch users with current state
  const { data: response, isLoading, error } = useUsers({
    pagination: { page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
    sort: sorting[0] ? { 
      field: sorting[0].id as keyof User, 
      direction: sorting[0].desc ? 'desc' : 'asc' 
    } : undefined,
    filter: {
      ...(searchName && { name: searchName }),
      ...(searchEmail && { email: searchEmail }),
    },
  })

  const data = response?.users || []
  const totalItems = response?.meta?.pagination?.total || 0
  const pageCount = Math.ceil(totalItems / pagination.pageSize)

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
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
      if (start > 2) pages.push('ellipsis');
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < pageCount - 1) pages.push('ellipsis');
      if (end < pageCount) pages.push(pageCount);
    }
    
    return pages;
  }, [pageCount, pagination.pageIndex])

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
  })

  if (error) {
    return <div className="p-5 text-red-500">Error loading users: {error.message}</div>
  }

  return <div className="p-5 space-y-6">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Users Management</h2>
        <InviteUserDialog />
      </div>
      <div className="text-sm text-muted-foreground">
        {isLoading ? 'Loading...' : `${totalItems} total users`}
      </div>
    </div>

    {/* Search and Filter Controls */}
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={searchName}
          onChange={(e) => {
            setSearchName(e.target.value)
            setPagination(prev => ({ ...prev, pageIndex: 0 }))
          }}
          className="pl-9"
        />
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={searchEmail}
          onChange={(e) => {
            setSearchEmail(e.target.value)
            setPagination(prev => ({ ...prev, pageIndex: 0 }))
          }}
          className="pl-9"
        />
      </div>
      <div className="w-full sm:w-[180px]">
        <Select
          value={pagination.pageSize.toString()}
          onValueChange={(value) => {
            setPagination(prev => ({ ...prev, pageSize: parseInt(value), pageIndex: 0 }))
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
    <Table>
      <TableCaption>A list of all users in the system.</TableCaption>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => {
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
        {table.getRowModel().rows.map(row => {
          return (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        {table.getFooterGroups().map(footerGroup => {
          return (
            <TableRow key={footerGroup.id}>
              {footerGroup.headers.map(header => (
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
        Showing {data.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1} to{' '}
        {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalItems)} of {totalItems} users
      </div>
      
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              size="default"
              onClick={() => {
                if (table.getCanPreviousPage()) {
                  table.previousPage()
                }
              }}
              className={cn(
                !table.getCanPreviousPage() && 'pointer-events-none opacity-50',
                'cursor-pointer'
              )}
            />
          </PaginationItem>
          
          {pageNumbers.map((page, idx) => (
            <PaginationItem key={`${page}-${idx}`}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  size="default"
                  onClick={() => setPagination(prev => ({ ...prev, pageIndex: page - 1 }))}
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
                  table.nextPage()
                }
              }}
              className={cn(
                !table.getCanNextPage() && 'pointer-events-none opacity-50',
                'cursor-pointer'
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  </div>;
}