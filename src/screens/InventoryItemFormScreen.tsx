import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useInventoryItemQuery, useCreateInventoryItemMutation, useUpdateInventoryItemMutation,
  useDuplicateInventoryItemMutation, useArchiveInventoryItemMutation, useRestoreInventoryItemMutation, useDeleteInventoryItemMutation,
  type InventoryItemInput, type Specification,
} from '../api/inventoryItems'
import { apiErrorMessage } from '../api/client'
import { CATEGORY_NAMES, subcategoriesFor, PROJECT_CATEGORIES, UNIT_SUGGESTIONS } from '../inventoryTaxonomy'
import { C, FONT, AppShell, Header, PillButton, Card } from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { ConfirmDialog } from '../components/Modal'
import { AppIcon } from '../components/icons'
import { useToast } from '../components/Toast'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }
const inputClass = "w-full rounded-xl border-2 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-forest)]"

interface FormState {
  name: string; sku: string; category: string; subcategory: string; description: string
  unit: string; price: string; quantityAvailable: string; minStockLevel: string; brand: string
  supplierName: string; supplierContact: string
  specifications: Specification[]
  length: string; width: string; height: string; dimUnit: string; weightKg: string
  projectSuitability: string[]
  existingImages: string[]
}

const EMPTY_FORM: FormState = {
  name: '', sku: '', category: '', subcategory: '', description: '',
  unit: '', price: '', quantityAvailable: '0', minStockLevel: '0', brand: '',
  supplierName: '', supplierContact: '',
  specifications: [],
  length: '', width: '', height: '', dimUnit: 'cm', weightKg: '',
  projectSuitability: [],
  existingImages: [],
}

/** Add/edit a single product. One rich form covers everything the redesign
 * asked for — identity (name/SKU/category/subcategory/description/brand),
 * media, pricing & stock, supplier, free-form specifications, dimensions,
 * and project suitability. Category/subcategory/unit are plain text inputs
 * with a <datalist> of suggestions — native HTML combobox behavior means
 * an owner can pick a suggestion *or* type something entirely new with no
 * extra component, which is exactly the "extensible" requirement. */
export function InventoryItemFormScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { show: showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: existing, isLoading } = useInventoryItemQuery(id)
  const createMutation = useCreateInventoryItemMutation()
  const updateMutation = useUpdateInventoryItemMutation()
  const duplicateMutation = useDuplicateInventoryItemMutation()
  const archiveMutation = useArchiveInventoryItemMutation()
  const restoreMutation = useRestoreInventoryItemMutation()
  const deleteMutation = useDeleteInventoryItemMutation()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [newImages, setNewImages] = useState<File[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  useEffect(() => {
    if (!existing) return
    setForm({
      name: existing.name, sku: existing.sku, category: existing.category, subcategory: existing.subcategory,
      description: existing.description, unit: existing.unit, price: String(existing.price),
      quantityAvailable: String(existing.quantityAvailable), minStockLevel: String(existing.minStockLevel),
      brand: existing.brand, supplierName: existing.supplier.name, supplierContact: existing.supplier.contact,
      specifications: existing.specifications,
      length: existing.dimensions.length != null ? String(existing.dimensions.length) : '',
      width: existing.dimensions.width != null ? String(existing.dimensions.width) : '',
      height: existing.dimensions.height != null ? String(existing.dimensions.height) : '',
      dimUnit: existing.dimensions.unit || 'cm',
      weightKg: existing.dimensions.weightKg != null ? String(existing.dimensions.weightKg) : '',
      projectSuitability: existing.projectSuitability,
      existingImages: existing.images,
    })
  }, [existing])

  const addSpecRow = () => set('specifications', [...form.specifications, { key: '', value: '' }])
  const updateSpecRow = (i: number, patch: Partial<Specification>) => set('specifications', form.specifications.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const removeSpecRow = (i: number) => set('specifications', form.specifications.filter((_, idx) => idx !== i))

  const onPickImages = (files: FileList | null) => {
    if (!files) return
    setNewImages((prev) => [...prev, ...Array.from(files)].slice(0, 6 - form.existingImages.length))
  }
  const removeExistingImage = (url: string) => set('existingImages', form.existingImages.filter((u) => u !== url))
  const removeNewImage = (idx: number) => setNewImages((prev) => prev.filter((_, i) => i !== idx))

  const valid = form.name.trim() && form.category.trim() && form.unit.trim() && form.price.trim() && Number(form.price) >= 0

  const toInput = (): InventoryItemInput => ({
    name: form.name.trim(),
    sku: form.sku.trim(),
    category: form.category.trim(),
    subcategory: form.subcategory.trim(),
    description: form.description.trim(),
    unit: form.unit.trim(),
    price: Number(form.price) || 0,
    quantityAvailable: Number(form.quantityAvailable) || 0,
    minStockLevel: Number(form.minStockLevel) || 0,
    brand: form.brand.trim(),
    supplier: { name: form.supplierName.trim(), contact: form.supplierContact.trim() },
    specifications: form.specifications.filter((s) => s.key.trim() && s.value.trim()),
    dimensions: {
      length: form.length ? Number(form.length) : null,
      width: form.width ? Number(form.width) : null,
      height: form.height ? Number(form.height) : null,
      unit: form.dimUnit,
      weightKg: form.weightKg ? Number(form.weightKg) : null,
    },
    projectSuitability: form.projectSuitability,
    existingImages: form.existingImages,
    newImages,
  })

  const save = () => {
    if (!valid) return
    const input = toInput()
    if (isEdit && id) {
      updateMutation.mutate({ id, input }, {
        onSuccess: () => { showToast({ title: 'Product updated', tone: 'success' }); nav('/quincaillerie/inventory') },
        onError: (err) => showToast({ title: 'Failed to save', description: apiErrorMessage(err), tone: 'error' }),
      })
    } else {
      createMutation.mutate(input, {
        onSuccess: () => { showToast({ title: 'Product added', tone: 'success' }); nav('/quincaillerie/inventory') },
        onError: (err) => showToast({ title: 'Failed to save', description: apiErrorMessage(err), tone: 'error' }),
      })
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  if (isEdit && isLoading) return <AppShell noNav>{null}</AppShell>

  return (
    <AppShell noNav>
      <Header title={isEdit ? 'Edit product' : 'Add product'} back action={
        isEdit && existing ? (
          <button
            onClick={() => (existing.status === 'active' ? archiveMutation : restoreMutation).mutate(existing.id, {
              onSuccess: () => showToast({ title: existing.status === 'active' ? 'Archived' : 'Restored', tone: 'success' }),
            })}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}
          >
            {existing.status === 'active' ? 'Archive' : 'Restore'}
          </button>
        ) : undefined
      } />

      <div className="space-y-5 overflow-y-auto px-5 py-5 pb-32 sm:mx-auto sm:max-w-2xl">
        {/* Identity */}
        <Card><div className="space-y-3 p-4">
          <Field label="Product name *">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Cement (50kg bag)" className={inputClass} style={inputStyle} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Optional" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Brand">
              <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Optional" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category *">
              <input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="Pick or type new"
                list="inventory-category-options"
                className={inputClass} style={inputStyle}
              />
              <datalist id="inventory-category-options">{CATEGORY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Subcategory">
              <input
                value={form.subcategory}
                onChange={(e) => set('subcategory', e.target.value)}
                placeholder="Optional"
                list="inventory-subcategory-options"
                className={inputClass} style={inputStyle}
              />
              <datalist id="inventory-subcategory-options">{subcategoriesFor(form.category).map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Optional details a buyer would want to know" className={`${inputClass} resize-none`} style={inputStyle} />
          </Field>
        </div></Card>

        {/* Images */}
        <Card><div className="space-y-3 p-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Photos (up to 6)</div>
          <div className="flex flex-wrap gap-2">
            {form.existingImages.map((url) => (
              <div key={url} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: C.parchmentDark }}>
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeExistingImage(url)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                  <AppIcon name="close" size={11} style={{ color: '#fff' }} />
                </button>
              </div>
            ))}
            {newImages.map((file, i) => (
              <div key={i} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: C.forest }}>
                <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeNewImage(i)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                  <AppIcon name="close" size={11} style={{ color: '#fff' }} />
                </button>
              </div>
            ))}
            {form.existingImages.length + newImages.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed"
                style={{ borderColor: C.parchmentDark, color: C.inkSubtle }}
              >
                <AppIcon name="camera" size={18} />
                <span style={{ fontFamily: FONT.mono }} className="text-[9px]">Add</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPickImages(e.target.files); e.target.value = '' }} />
          </div>
        </div></Card>

        {/* Pricing & stock */}
        <Card><div className="space-y-3 p-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Pricing & stock</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit *">
              <input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="bag, sheet, meter…" list="inventory-unit-options" className={inputClass} style={inputStyle} />
              <datalist id="inventory-unit-options">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
            </Field>
            <Field label="Price (XAF) *">
              <input value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity available">
              <input value={form.quantityAvailable} onChange={(e) => set('quantityAvailable', e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Minimum stock level">
              <input value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          {Number(form.quantityAvailable) <= Number(form.minStockLevel) && (
            <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}>
              <AppIcon name="alert" size={13} /> This will show as low stock (quantity ≤ minimum).
            </div>
          )}
        </div></Card>

        {/* Supplier */}
        <Card><div className="space-y-3 p-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Supplier (optional)</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier name">
              <input value={form.supplierName} onChange={(e) => set('supplierName', e.target.value)} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Supplier contact">
              <input value={form.supplierContact} onChange={(e) => set('supplierContact', e.target.value)} placeholder="Phone or email" className={inputClass} style={inputStyle} />
            </Field>
          </div>
        </div></Card>

        {/* Specifications */}
        <Card><div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Specifications</div>
            <button onClick={addSpecRow} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">+ Add row</button>
          </div>
          {form.specifications.length === 0 ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs italic">e.g. Grade: 42.5N, Diameter: 12mm, Color: Red</p>
          ) : (
            form.specifications.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={spec.key} onChange={(e) => updateSpecRow(i, { key: e.target.value })} placeholder="Key" className="w-2/5 rounded-lg border-2 px-3 py-2 text-xs outline-none" style={inputStyle} />
                <input value={spec.value} onChange={(e) => updateSpecRow(i, { value: e.target.value })} placeholder="Value" className="flex-1 rounded-lg border-2 px-3 py-2 text-xs outline-none" style={inputStyle} />
                <button onClick={() => removeSpecRow(i)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ color: 'var(--status-error-text)' }}>
                  <AppIcon name="close" size={13} />
                </button>
              </div>
            ))
          )}
        </div></Card>

        {/* Dimensions */}
        <Card><div className="space-y-3 p-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Dimensions (optional)</div>
          <div className="grid grid-cols-4 gap-2">
            <input value={form.length} onChange={(e) => set('length', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="L" inputMode="decimal" className="rounded-lg border-2 px-2.5 py-2 text-xs text-center outline-none" style={inputStyle} />
            <input value={form.width} onChange={(e) => set('width', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="W" inputMode="decimal" className="rounded-lg border-2 px-2.5 py-2 text-xs text-center outline-none" style={inputStyle} />
            <input value={form.height} onChange={(e) => set('height', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="H" inputMode="decimal" className="rounded-lg border-2 px-2.5 py-2 text-xs text-center outline-none" style={inputStyle} />
            <select value={form.dimUnit} onChange={(e) => set('dimUnit', e.target.value)} className="rounded-lg border-2 px-1 py-2 text-xs outline-none" style={inputStyle}>
              {['cm', 'm', 'mm'].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <Field label="Weight (kg)">
            <input value={form.weightKg} onChange={(e) => set('weightKg', e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className={inputClass} style={inputStyle} />
          </Field>
        </div></Card>

        {/* Project suitability */}
        <Card><div className="space-y-3 p-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Suited for which project types?</div>
          <ChipGroup options={PROJECT_CATEGORIES} value={form.projectSuitability} onChange={(v) => set('projectSuitability', v as string[])} multiple />
        </div></Card>

        {isEdit && existing && (
          <div className="flex gap-2">
            <button
              onClick={() => duplicateMutation.mutate(existing.id, {
                onSuccess: (dup) => { showToast({ title: 'Duplicated', tone: 'success' }); nav(`/quincaillerie/inventory/${dup.id}/edit`) },
              })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold"
              style={{ borderColor: C.parchmentDark, color: C.ink, fontFamily: FONT.sans }}
            >
              <AppIcon name="copy" size={13} /> Duplicate
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold"
              style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
            >
              <AppIcon name="trash" size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 px-5 pb-8 pt-4 backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderTop: `1px solid ${C.glassBorder}`, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={save} fullWidth disabled={!valid || saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}</PillButton>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={() => {
          if (!existing) return
          deleteMutation.mutate(existing.id, {
            onSuccess: () => { showToast({ title: 'Product deleted', tone: 'success' }); nav('/quincaillerie/inventory') },
            onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
          })
        }}
        title="Delete this product?"
        description={`${existing?.name} will be permanently removed. This can't be undone — consider archiving instead.`}
        confirmLabel="Delete"
        danger
      />
    </AppShell>
  )
}
