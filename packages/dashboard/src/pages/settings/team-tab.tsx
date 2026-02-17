import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  MoreHorizontal,
  UserX,
  MailPlus,
  Loader2,
  Users,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleBadge } from '@/components/role-badge';
import { useProject } from '@/providers/project-provider';
import { useAuth } from '@/hooks/use-auth';
import {
  useMembers,
  useInviteMember,
  useChangeMemberRole,
  useRemoveMember,
  useResendInvite,
} from '@/hooks/use-members';
import type { TeamMember, MemberRole, InviteMemberInput } from '@/types/settings';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  invited: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  deactivated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function getInitials(name: string, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Permissions Matrix
// ---------------------------------------------------------------------------

const PERMISSIONS = [
  { label: 'Manage project settings', owner: true, admin: false, developer: false, viewer: false },
  { label: 'Delete project', owner: true, admin: false, developer: false, viewer: false },
  { label: 'Manage environments', owner: true, admin: true, developer: false, viewer: false },
  { label: 'Manage team members', owner: true, admin: true, developer: false, viewer: false },
  { label: 'Manage API keys', owner: true, admin: true, developer: false, viewer: false },
  { label: 'Create/edit flags & segments', owner: true, admin: true, developer: true, viewer: false },
  { label: 'Toggle flags', owner: true, admin: true, developer: true, viewer: false },
  { label: 'View everything', owner: true, admin: true, developer: true, viewer: true },
];

function PermissionsMatrix() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          Role Permissions Reference
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead className="text-center">Owner</TableHead>
                <TableHead className="text-center">Admin</TableHead>
                <TableHead className="text-center">Developer</TableHead>
                <TableHead className="text-center">Viewer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((p) => (
                <TableRow key={p.label}>
                  <TableCell className="text-sm">{p.label}</TableCell>
                  <TableCell className="text-center">{p.owner ? <Check className="mx-auto size-4 text-green-600" /> : <X className="mx-auto size-4 text-muted-foreground/30" />}</TableCell>
                  <TableCell className="text-center">{p.admin ? <Check className="mx-auto size-4 text-green-600" /> : <X className="mx-auto size-4 text-muted-foreground/30" />}</TableCell>
                  <TableCell className="text-center">{p.developer ? <Check className="mx-auto size-4 text-green-600" /> : <X className="mx-auto size-4 text-muted-foreground/30" />}</TableCell>
                  <TableCell className="text-center">{p.viewer ? <Check className="mx-auto size-4 text-green-600" /> : <X className="mx-auto size-4 text-muted-foreground/30" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Main Tab
// ---------------------------------------------------------------------------

export function TeamTab() {
  const { activeProjectId } = useProject();
  const { user } = useAuth();
  const { data, isLoading } = useMembers(activeProjectId);
  const inviteMutation = useInviteMember();
  const changeRoleMutation = useChangeMemberRole();
  const removeMutation = useRemoveMember();
  const resendMutation = useResendInvite();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);

  // Invite form state
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<MemberRole>('developer');
  const [formName, setFormName] = useState('');

  const members = data?.members ?? [];

  const handleInvite = async () => {
    if (!activeProjectId || !formEmail) return;
    const input: InviteMemberInput = {
      email: formEmail,
      role: formRole,
      name: formName || undefined,
    };
    try {
      await inviteMutation.mutateAsync({ projectId: activeProjectId, input });
      toast.success(`Invitation sent to ${formEmail}`);
      setInviteOpen(false);
      setFormEmail('');
      setFormName('');
      setFormRole('developer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: MemberRole) => {
    if (!activeProjectId) return;
    try {
      await changeRoleMutation.mutateAsync({
        projectId: activeProjectId,
        memberId,
        role: newRole,
      });
      toast.success('Role updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const handleRemove = async () => {
    if (!activeProjectId || !removeMember) return;
    try {
      await removeMutation.mutateAsync({
        projectId: activeProjectId,
        memberId: removeMember._id,
      });
      toast.success(
        removeMember.status === 'invited'
          ? 'Invitation revoked'
          : `${removeMember.name || removeMember.email} removed from project`,
      );
      setRemoveMember(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleResendInvite = async (memberId: string, email: string) => {
    if (!activeProjectId) return;
    try {
      await resendMutation.mutateAsync({ projectId: activeProjectId, memberId });
      toast.success(`Invitation resent to ${email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Team Members</h3>
          <p className="text-xs text-muted-foreground">
            {data?.active ?? 0} active, {data?.invited ?? 0} pending
          </p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          Invite Member
        </Button>
      </div>

      {/* Permissions Reference */}
      <div className="mb-4">
        <PermissionsMatrix />
      </div>

      {/* Members Table */}
      {members.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isCurrentUser = member.userId === user?._id;
                return (
                  <TableRow
                    key={member._id}
                    className={isCurrentUser ? 'bg-muted/30' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">
                              {member.name || member.email.split('@')[0]}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!isCurrentUser && member.status === 'active' ? (
                        <Select
                          value={member.role}
                          onValueChange={(role) => handleChangeRole(member._id, role as MemberRole)}
                        >
                          <SelectTrigger className="h-7 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`border-0 text-xs capitalize ${STATUS_STYLES[member.status]}`}
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : 'Pending'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(member.lastActiveAt)}
                    </TableCell>
                    <TableCell>
                      {!isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.status === 'invited' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleResendInvite(member._id, member.email)
                                }
                              >
                                <MailPlus className="mr-2 size-3.5" />
                                Resend Invitation
                              </DropdownMenuItem>
                            )}
                            {member.status === 'invited' && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setRemoveMember(member)}
                            >
                              <UserX className="mr-2 size-3.5" />
                              {member.status === 'invited'
                                ? 'Revoke Invitation'
                                : 'Remove from project'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Users className="size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No team members</p>
          <p className="text-xs text-muted-foreground">Invite people to collaborate</p>
          <Button size="sm" className="mt-4" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Invite Member
          </Button>
        </div>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="colleague@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Their name"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!formEmail || inviteMutation.isPending}
            >
              {inviteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeMember} onOpenChange={(open) => { if (!open) setRemoveMember(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeMember?.status === 'invited' ? 'Revoke Invitation' : 'Remove Member'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeMember?.status === 'invited'
                ? `Revoke the invitation for ${removeMember?.email}?`
                : `Remove ${removeMember?.name || removeMember?.email} from this project? They will lose access immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRemoveMember(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {removeMember?.status === 'invited' ? 'Revoke' : 'Remove'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
