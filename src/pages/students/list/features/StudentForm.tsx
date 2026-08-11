// File: src/pages/students/list/features/StudentForm.tsx
import React from 'react'
import { Ban, MonitorOff, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { Drawer } from '../../../../components/ui/Drawer.tsx'
import { Text } from '../../../../components/input/Text.tsx'
import { Password } from '../../../../components/input/Password.tsx'
import type { StudentRow as StudentRowData, FormState } from '../hooks.ts'
type Strings = {
    formCreateTitle: string
    formEditTitle: string
    formCreateSubtitle: string
    formEditSubtitle: string
    fieldUsername: string
    fieldFullName: string
    fieldPassword: string
    fieldGrade: string
    fieldSection: string
    fieldNonReader: string
    cancel: string
    create: string
    creating: string
    save: string
    saving: string
    editNote: string
    quickEnable: string
    quickDisable: string
    quickDelete: string
    quickForceLogout: string
    onlineLabel: string
    offlineLabel: string
}
interface StudentFormProps {
    t: Strings
    open: boolean
    editing: StudentRowData | null
    form: FormState
    setForm: React.Dispatch<React.SetStateAction<FormState>>
    formError: string
    submitting: boolean
    onSubmit: (e: React.FormEvent) => void
    onClose: () => void
    // Quick actions — duplicates of the roster row's icon buttons so a
    // teacher already in the edit drawer doesn't have to close it and go
    // back to the row to disable/enable them, force-logout them, or
    // delete the account. Only relevant once editing is non-null (an
    // account has to already exist to act on).
    onToggleStatus: (e: React.MouseEvent) => void
    onDelete: (e: React.MouseEvent) => void
    onForceLogout: (e: React.MouseEvent) => void
    isTogglingStatus: boolean
    isDeleting: boolean
    isForcingLogout: boolean
    isOnline: boolean
}
// The add/edit panel used to sit permanently docked in a right-hand
// column next to the roster, eating a fixed chunk of screen width even
// when nobody was editing anything. It's now a slide-in Drawer instead —
// triggered by "Add student" or a row's edit icon — while search/sort/
// filter (StudentFilters) stay put as an always-visible bar above the
// roster, per the "search stays visible, add/edit floats over it" layout.
//
// Fields are sized up slightly from the old docked-panel version
// (py-3.5 instead of py-3, text-base) since the drawer has more room to
// breathe than the old cramped 380px sidebar did. Cancel is now a solid
// outlined red pill instead of plain text — it was easy to miss before.
//
// The quick-action buttons below are deliberately styled differently
// from the roster row's icon buttons: those are neutral-gray at rest and
// only pick up their color on hover (compact, icon-only, sit in a dense
// row). These are full-width-friendly pill buttons that are already
// tinted with their color at rest and carry a text label — the drawer
// has room to spare and these are less frequent, more deliberate actions.
export const StudentForm: React.FC<StudentFormProps> = ({
                                                            t,
                                                            open,
                                                            editing,
                                                            form,
                                                            setForm,
                                                            formError,
                                                            submitting,
                                                            onSubmit,
                                                            onClose,
                                                            onToggleStatus,
                                                            onDelete,
                                                            onForceLogout,
                                                            isTogglingStatus,
                                                            isDeleting,
                                                            isForcingLogout,
                                                            isOnline,
                                                        }) => {
    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={editing ? t.formEditTitle : t.formCreateTitle}
            subtitle={editing ? t.formEditSubtitle : t.formCreateSubtitle}
            icon={
                <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        editing ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                    }`}
                >
                    <UserPlus size={18} />
                </span>
            }
        >
            {editing && (
                <div className="mb-5 border-b border-gray-900/5 pb-5 dark:border-gray-100/10">
                    <span
                        className={`mb-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isOnline
                                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                : 'bg-gray-500/10 text-gray-500 dark:bg-gray-100/10 dark:text-gray-400'
                        }`}
                    >
                        {isOnline ? t.onlineLabel : t.offlineLabel}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={isForcingLogout || editing.is_disabled}
                            onClick={onForceLogout}
                            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-violet-500/15 px-3.5 py-2 text-xs font-bold text-violet-700 transition-colors duration-200 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-500/25"
                        >
                            <MonitorOff size={14} />
                            {t.quickForceLogout}
                        </button>
                        <button
                            type="button"
                            disabled={isTogglingStatus}
                            onClick={onToggleStatus}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                                editing.is_disabled
                                    ? 'bg-teal-500/15 text-teal-700 hover:bg-teal-500/25 dark:text-teal-300 dark:hover:bg-teal-500/25'
                                    : 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300 dark:hover:bg-amber-500/25'
                            }`}
                        >
                            {editing.is_disabled ? <ShieldCheck size={14} /> : <Ban size={14} />}
                            {editing.is_disabled ? t.quickEnable : t.quickDisable}
                        </button>
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={onDelete}
                            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 py-2 text-xs font-bold text-red-700 transition-colors duration-200 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/25"
                        >
                            <Trash2 size={14} />
                            {t.quickDelete}
                        </button>
                    </div>
                </div>
            )}
            <form onSubmit={onSubmit}>
                {!editing && (
                    <Text
                        name="username"
                        label={t.fieldUsername}
                        value={form.username}
                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                        required
                        className="mb-5"
                        inputClassName="px-4 py-3.5 text-base rounded-xl transition-colors duration-300"
                    />
                )}
                <Text
                    name="fullName"
                    label={t.fieldFullName}
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                    className="mb-5"
                    inputClassName="px-4 py-3.5 text-base rounded-xl transition-colors duration-300"
                />
                {!editing && (
                    <Password
                        name="password"
                        label={t.fieldPassword}
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        required
                        className="mb-5"
                        inputClassName="px-4 py-3.5 pr-11 text-base rounded-xl transition-colors duration-300"
                    />
                )}
                <div className="mb-5 grid grid-cols-2 gap-4">
                    <Text
                        name="gradeLevel"
                        type="number"
                        label={t.fieldGrade}
                        value={form.gradeLevel}
                        onChange={(e) => setForm((f) => ({ ...f, gradeLevel: e.target.value }))}
                        inputClassName="px-4 py-3.5 text-base rounded-xl transition-colors duration-300"
                    />
                    <Text
                        name="section"
                        label={t.fieldSection}
                        value={form.section}
                        onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                        inputClassName="px-4 py-3.5 text-base rounded-xl transition-colors duration-300"
                    />
                </div>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <input
                        type="checkbox"
                        checked={form.isNonReader}
                        onChange={(e) => setForm((f) => ({ ...f, isNonReader: e.target.checked }))}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    {t.fieldNonReader}
                </label>
                {editing && (
                    <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-400">{t.editNote}</p>
                )}
                {formError && (
                    <p className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">{formError}</p>
                )}
                <div className="mt-5 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-full border-2 border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-colors duration-300 hover:bg-red-50 dark:border-red-500/40 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                        {t.cancel}
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="cursor-pointer rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#c2410c] transition-[background-color,box-shadow,transform] duration-300 active:translate-y-1 active:shadow-[0_1px_0_0_#c2410c] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-600 dark:shadow-[0_4px_0_0_#9a3412]"
                    >
                        {editing ? (submitting ? t.saving : t.save) : (submitting ? t.creating : t.create)}
                    </button>
                </div>
            </form>
        </Drawer>
    )
}
export default StudentForm