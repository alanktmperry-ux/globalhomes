import { useState } from 'react';
import { Bookmark, ChevronDown, Edit, Trash2, Save, Users, Lock, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useContactSavedViews } from '@/features/agents/hooks/useContactSavedViews';
import {
  ALL_CONTACTS_VIEW_ID, EMPTY_FILTERS, DEFAULT_SORT, DEFAULT_COLUMNS,
  filtersEqual, sortEqual,
  type ContactSavedView, type ContactFilters, type ContactSort, type ContactColumnKey,
} from './savedViews/types';

interface Props {
  activeViewId: string;
  filters: ContactFilters;
  sort: ContactSort;
  columns: ContactColumnKey[];
  onSelectView: (view: ContactSavedView | null) => void;
}

const SavedViewsBar = ({ activeViewId, filters, sort, columns, onSelectView }: Props) => {
  const { views, createView, updateView, deleteView, canEditView } = useContactSavedViews();
  const [open, setOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveShared, setSaveShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingView, setEditingView] = useState<ContactSavedView | null>(null);
  const [editName, setEditName] = useState('');
  const [editShared, setEditShared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContactSavedView | null>(null);

  const personalViews = views.filter(v => !v.is_shared);
  const sharedViews = views.filter(v => v.is_shared);

  const activeView = activeViewId !== ALL_CONTACTS_VIEW_ID
    ? views.find(v => v.id === activeViewId) ?? null
    : null;
  const activeName = activeView?.name ?? 'All Contacts';

  // Detect dirty (current state differs from active view, or differs from defaults if "All Contacts")
  const baseFilters = activeView?.filters ?? EMPTY_FILTERS;
  const baseSort = activeView?.sort ?? DEFAULT_SORT;
  const baseColumns = activeView?.columns ?? DEFAULT_COLUMNS;
  const isDirty =
    !filtersEqual(filters, baseFilters) ||
    !sortEqual(sort, baseSort) ||
    JSON.stringify(columns) !== JSON.stringify(baseColumns);

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await createView({
        name, filters, sort, columns, is_shared: saveShared,
      });
      if (created) {
        toast.success(`View "${name}" saved`);
        onSelectView(created);
      }
      setShowSaveDialog(false);
      setSaveName('');
      setSaveShared(false);
    } catch (e: any) {
      if (e?.code === '23505') {
        toast.error('You already have a view with that name');
      } else {
        toast.error(e?.message || 'Failed to save view');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCurrent = async () => {
    if (!activeView) return;
    if (!canEditView(activeView)) {
      toast.error('You can\'t edit this view');
      return;
    }
    try {
      await updateView(activeView.id, { filters, sort, columns });
      toast.success(`Updated "${activeView.name}"`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update view');
    }
  };

  const handleEdit = async () => {
    if (!editingView) return;
    const name = editName.trim();
    if (!name) return;
    try {
      await updateView(editingView.id, { name, is_shared: editShared });
      toast.success('View updated');
      setEditingView(null);
    } catch (e: any) {
      if (e?.code === '23505') toast.error('You already have a view with that name');
      else toast.error(e?.message || 'Failed to update view');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteView(confirmDelete.id);
      toast.success('View deleted');
      if (activeViewId === confirmDelete.id) onSelectView(null);
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete view');
    }
  };

  const renderViewRow = (v: ContactSavedView) => {
    const editable = canEditView(v);
    const active = v.id === activeViewId;
    return (
      <div
        key={v.id}
        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer ${active ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
        onClick={() => { onSelectView(v); setOpen(false); }}
      >
        {active && <Check size={12} />}
        <span className={`flex-1 truncate ${active ? 'font-medium' : ''}`}>{v.name}</span>
        {v.is_shared && <Users size={10} className="text-muted-foreground" />}
        {editable && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingView(v);
                setEditName(v.name);
                setEditShared(v.is_shared);
                setOpen(false);
              }}
              className="p-1 hover:bg-background rounded"
              title="Rename / share"
            >
              <Edit size={10} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(v); setOpen(false); }}
              className="p-1 hover:bg-destructive/15 text-destructive rounded"
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Bookmark size={12} />
            <span className="max-w-[140px] truncate">{activeName}</span>
            {isDirty && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" title="Unsaved changes" />}
            <ChevronDown size={12} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer ${activeViewId === ALL_CONTACTS_VIEW_ID ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
            onClick={() => { onSelectView(null); setOpen(false); }}
          >
            {activeViewId === ALL_CONTACTS_VIEW_ID && <Check size={12} />}
            <span className="flex-1">All Contacts</span>
            <Lock size={10} className="text-muted-foreground" />
          </div>

          {personalViews.length > 0 && (
            <>
              <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase text-muted-foreground">My Views</div>
              {personalViews.map(renderViewRow)}
            </>
          )}

          {sharedViews.length > 0 && (
            <>
              <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase text-muted-foreground border-t border-border mt-1">Shared</div>
              {sharedViews.map(renderViewRow)}
            </>
          )}

          <div className="border-t border-border mt-2 pt-2 space-y-1">
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-7 justify-start text-xs gap-1.5"
              onClick={() => { setShowSaveDialog(true); setOpen(false); }}
            >
              <Plus size={12} /> Save current as new view
            </Button>
            {activeView && isDirty && canEditView(activeView) && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-7 justify-start text-xs gap-1.5"
                onClick={() => { handleUpdateCurrent(); setOpen(false); }}
              >
                <Save size={12} /> Update "{activeView.name}"
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
            <DialogDescription>Save the current filters, sort and columns as a reusable view.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="view-name" className="text-xs">Name</Label>
              <Input id="view-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Hot buyers — 1M+" autoFocus />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="view-shared" className="text-xs flex items-center gap-1.5">
                <Users size={12} /> Share with my agency
              </Label>
              <Switch id="view-shared" checked={saveShared} onCheckedChange={setSaveShared} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!saveName.trim() || saving}>
              {saving ? 'Saving...' : 'Save view'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingView} onOpenChange={(o) => !o && setEditingView(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit view</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-name" className="text-xs">Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-shared" className="text-xs flex items-center gap-1.5">
                <Users size={12} /> Shared with agency
              </Label>
              <Switch id="edit-shared" checked={editShared} onCheckedChange={setEditShared} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingView(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete view "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.is_shared
                ? 'This shared view will be removed for everyone in the agency.'
                : 'This will only delete your private view.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SavedViewsBar;
