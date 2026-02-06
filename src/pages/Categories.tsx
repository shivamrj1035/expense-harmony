import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCategories, CreateCategoryInput, Category } from "@/hooks/useCategories";
import { Plus, Trash2, Edit, FolderOpen, Power } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type CategoryFrequency = Database["public"]["Enums"]["category_frequency"];

const CATEGORY_ICONS = ["💰", "🏠", "🚗", "🍔", "🎮", "💼", "🛒", "🎓", "💊", "✈️", "🎬", "📱"];
const CATEGORY_COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#10B981",
  "#F43F5E",
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#6366F1",
];

const FREQUENCY_OPTIONS: { value: CategoryFrequency; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

export default function Categories() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: "",
    icon: "💰",
    color: "#8B5CF6",
    frequency: "MONTHLY",
    fixed_amount: undefined,
    is_email_enabled: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, ...formData });
    } else {
      await createCategory.mutateAsync(formData);
    }
    setIsOpen(false);
    setEditingCategory(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "💰",
      color: "#8B5CF6",
      frequency: "MONTHLY",
      fixed_amount: undefined,
      is_email_enabled: false,
    });
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
      frequency: category.frequency,
      fixed_amount: category.fixed_amount || undefined,
      is_email_enabled: category.is_email_enabled,
    });
    setIsOpen(true);
  };

  const toggleActive = async (category: Category) => {
    await updateCategory.mutateAsync({
      id: category.id,
      is_active: !category.is_active,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground">
              Organize your expenses with custom categories
            </p>
          </div>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) {
                setEditingCategory(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 glow-primary gap-2">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Create Category"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-background/50"
                    placeholder="e.g., Groceries"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                          formData.icon === icon
                            ? "bg-primary/20 ring-2 ring-primary"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`h-10 w-10 rounded-lg transition-all ${
                          formData.color === color ? "ring-2 ring-offset-2 ring-offset-background ring-white" : ""
                        }`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: CategoryFrequency) =>
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fixed Amount (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.fixed_amount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fixed_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="bg-background/50"
                    placeholder="Auto-generate this amount"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
                  <div>
                    <p className="font-medium">Email Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Include in periodic reports
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_email_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_email_enabled: checked })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={createCategory.isPending || updateCategory.isPending}
                >
                  {createCategory.isPending || updateCategory.isPending
                    ? "Saving..."
                    : editingCategory
                    ? "Update Category"
                    : "Create Category"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Grid */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <GlassCard
                key={category.id}
                variant="elevated"
                className={`group relative ${!category.is_active ? "opacity-60" : ""}`}
              >
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(category)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(category)}
                    className="h-8 w-8"
                  >
                    <Power
                      className={`h-4 w-4 ${category.is_active ? "text-accent" : "text-muted-foreground"}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCategory.mutate(category.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {category.frequency.toLowerCase()}
                    </p>
                    {category.fixed_amount && (
                      <p className="text-sm font-medium text-primary">
                        ${category.fixed_amount}/cycle
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {category.is_email_enabled && (
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary">
                      📧 Email
                    </span>
                  )}
                  {!category.is_active && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              No categories yet
            </p>
            <p className="text-sm text-muted-foreground">
              Create your first category to organize expenses
            </p>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
}
