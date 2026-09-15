import { supabase } from '../lib/supabase';
import { validateUUID, validateString, validateItemID, validateUUIDArray } from '../lib/validation';

export interface PackingTemplate {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  item_count?: number;
}

export interface PackingTemplateItem {
  id: string;
  template_id: string;
  text: string;
  sort_order: number;
  created_at: string;
}

export async function fetchTemplates(userId: string): Promise<PackingTemplate[]> {
  validateUUID(userId, 'user ID');
  const { data, error } = await supabase
    .from('packing_templates')
    .select('*, packing_template_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    ...t,
    item_count: t.packing_template_items?.[0]?.count ?? 0,
  }));
}

export async function createTemplate(userId: string, name: string): Promise<PackingTemplate> {
  validateUUID(userId, 'user ID');
  validateString(name, 'template name', 1, 200);

  const { data, error } = await supabase
    .from('packing_templates')
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  validateItemID(id);
  validateString(name, 'template name', 1, 200);

  const { error } = await supabase.from('packing_templates').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  validateItemID(id);
  const { error } = await supabase.from('packing_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTemplateItems(templateId: string): Promise<PackingTemplateItem[]> {
  validateItemID(templateId);
  const { data, error } = await supabase
    .from('packing_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addTemplateItem(templateId: string, text: string): Promise<void> {
  validateItemID(templateId);
  validateString(text, 'item text', 1, 500);

  const { data: existing } = await supabase
    .from('packing_template_items')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
  const { error } = await supabase
    .from('packing_template_items')
    .insert({ template_id: templateId, text, sort_order: nextOrder });
  if (error) throw error;
}

export async function deleteTemplateItem(itemId: string): Promise<void> {
  validateItemID(itemId);
  const { error } = await supabase.from('packing_template_items').delete().eq('id', itemId);
  if (error) throw error;
}

// Apply one or more templates to a trip's packing list
export async function applyTemplatesToTrip(tripId: string, userId: string, templateIds: string[]): Promise<void> {
  if (templateIds.length === 0) return;
  validateUUID(tripId, 'trip ID');
  validateUUID(userId, 'user ID');
  validateUUIDArray(templateIds, 'template IDs');

  const { data: items, error } = await supabase
    .from('packing_template_items')
    .select('text')
    .in('template_id', templateIds);
  if (error) throw error;
  if (!items || items.length === 0) return;

  // Get existing packing items to avoid duplicates
  const { data: existing } = await supabase
    .from('packing_items')
    .select('text')
    .eq('trip_id', tripId);
  const existingTexts = new Set((existing ?? []).map((e: any) => e.text.toLowerCase().trim()));

  // Get current max sort_order
  const { data: maxOrder } = await supabase
    .from('packing_items')
    .select('sort_order')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: false })
    .limit(1);
  let nextOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

  const rows = items
    .filter((item: any) => !existingTexts.has(item.text.toLowerCase().trim()))
    .map((item: any) => ({
      trip_id: tripId,
      created_by: userId,
      text: item.text,
      checked: false,
      sort_order: nextOrder++,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('packing_items').insert(rows);
    if (insertError) throw insertError;
  }
}
