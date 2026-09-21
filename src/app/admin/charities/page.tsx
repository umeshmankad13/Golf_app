"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import {
  Heart,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { Charity } from "@/types";

/**
 * Admin charity management page. Full CRUD for charities including
 * name, description, website URL, and active/inactive toggle.
 *
 * CRUD operations:
 * - Create: Insert a new charity record with optional image upload.
 * - Read: Load all charities on mount, sorted alphabetically by name.
 * - Update: Edit any field (name, description, URL, image) via the form.
 * - Delete: Remove a charity with browser confirmation dialog.
 *
 * Image upload flow:
 * 1. User selects a file via the file input.
 * 2. File is uploaded to Supabase Storage bucket "charity-images"
 *    under a "charities/" folder with a timestamp-based filename
 *    to prevent collisions.
 * 3. The public URL of the uploaded file is retrieved and stored
 *    in the form state (imageUrl).
 * 4. On form submit, the imageUrl is saved to the charity record
 *    in the database.
 *
 * Active toggle:
 * - Charities can be activated/deactivated without deleting them.
 * - Inactive charities are hidden from the public-facing charity
 *   selection but remain in the database for record keeping.
 *
 * Form reuse pattern:
 * - The same form is used for both create and edit operations.
 * - `editingId` determines the mode: null = create, non-null = edit.
 * - startEdit() populates the form with existing charity data.
 * - resetForm() clears all fields and returns to the list view.
 */
export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // editingId tracks whether we're creating (null) or editing (non-null)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  // imageUrl stores the public URL of the uploaded image (stored in Supabase Storage)
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadCharities();
  }, []);

  /** Fetch all charities sorted alphabetically by name. */
  async function loadCharities() {
    const { data } = await supabase
      .from("charities")
      .select("*")
      .order("name");

    setCharities(data || []);
    setLoading(false);
  }

  /** Clear all form fields and close the form. Used after save or cancel. */
  function resetForm() {
    setName("");
    setDescription("");
    setWebsiteUrl("");
    setImageUrl("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  /**
   * Populate the form with an existing charity's data for editing.
   * Sets editingId to the charity's ID so the form submits an update
   * instead of an insert.
   */
  function startEdit(charity: Charity) {
    setEditingId(charity.id);
    setName(charity.name);
    setDescription(charity.description || "");
    setWebsiteUrl(charity.website_url || "");
    setImageUrl(charity.image_url || "");
    setShowForm(true);
  }

  /**
   * Handle form submission for both create and update operations.
   * The editingId determines which operation to perform:
   * - If editingId is set, update the existing record.
   * - If editingId is null, insert a new record.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (editingId) {
      // Update existing charity
      const { error } = await supabase
        .from("charities")
        .update({ name, description, website_url: websiteUrl, image_url: imageUrl })
        .eq("id", editingId);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Charity updated!");
        resetForm();
        loadCharities();
      }
    } else {
      // Create new charity
      const { error } = await supabase.from("charities").insert({
        name,
        description,
        website_url: websiteUrl,
        image_url: imageUrl,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Charity created!");
        resetForm();
        loadCharities();
      }
    }

    setSaving(false);
    setTimeout(() => setSuccess(""), 3000);
  }

  /**
   * Delete a charity with browser confirmation.
   * Uses window.confirm() as a simple safeguard against accidental
   * deletion. The charity is permanently removed from the database.
   */
  async function handleDelete(id: string) {
    if (!confirm("Delete this charity?")) return;
    await supabase.from("charities").delete().eq("id", id);
    loadCharities();
  }

  /**
   * Toggle a charity's active status.
   * The is_active flag controls whether the charity appears in the
   * public-facing charity selection on the user side. Inactive
   * charities are hidden but preserved in the database.
   */
  async function toggleActive(id: string, current: boolean) {
    await supabase
      .from("charities")
      .update({ is_active: !current })
      .eq("id", id);
    loadCharities();
  }

  /**
   * Handle image file upload to Supabase Storage.
   *
   * Upload process:
   * 1. Extract the file extension from the original filename.
   * 2. Create a unique path using "charities/" folder + timestamp
   *    to prevent filename collisions.
   * 3. Upload to the "charity-images" storage bucket.
   * 4. Retrieve the public URL of the uploaded file.
   * 5. Set the imageUrl state so the form can save it with the charity.
   *
   * The storage bucket "charity-images" must be configured in Supabase
   * with public access for the images to be viewable on the client side.
   */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    // Use timestamp for unique filename to prevent collisions
    const filePath = `charities/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("charity-images")
      .upload(filePath, file);

    if (uploadError) {
      setError("Failed to upload image");
      setUploading(false);
      return;
    }

    // getPublicUrl returns the full URL to access the uploaded image.
    // This URL is stored in the charity record and used for display.
    const { data: urlData } = supabase.storage
      .from("charity-images")
      .getPublicUrl(filePath);

    setImageUrl(urlData.publicUrl);
    setUploading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Charity Management</h1>
          <p className="text-muted text-sm mt-1">
            Add, edit, or remove charities from the platform
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Charity
        </Button>
      </div>

      {/* Success notification: auto-dismisses after 3 seconds */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* 
        Charity form: shared between create and edit modes.
        The form header text and submit button label change based on
        whether editingId is set.
      */}
      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Charity Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  rows={3}
                />
              </div>
              <Input
                label="Website URL"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />

              {/* Image upload section: file input + preview */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Charity Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {uploading && (
                  <p className="text-xs text-muted">Uploading...</p>
                )}
                {/* Image preview: shown after successful upload */}
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Charity preview"
                    className="w-20 h-20 rounded-lg object-cover mt-2"
                  />
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" loading={saving}>
                  {/* Button label changes based on create vs edit mode */}
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Charities list: shows all charities with actions */}
      <Card>
        <CardContent>
          {charities.length > 0 ? (
            <div className="space-y-3">
              {charities.map((charity) => (
                <div
                  key={charity.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{charity.name}</p>
                      {charity.description && (
                        <p className="text-sm text-muted line-clamp-1">
                          {charity.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active toggle button: click to flip active status */}
                    <button
                      onClick={() => toggleActive(charity.id, charity.is_active)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        charity.is_active
                          ? "bg-success/10 text-success"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      {charity.is_active ? "Active" : "Inactive"}
                    </button>
                    {/* Edit button: opens form with charity data pre-filled */}
                    <button
                      onClick={() => startEdit(charity)}
                      className="p-1.5 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Delete button: triggers confirmation dialog */}
                    <button
                      onClick={() => handleDelete(charity.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No charities yet</p>
              <p className="text-sm mt-1">Click "Add Charity" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
