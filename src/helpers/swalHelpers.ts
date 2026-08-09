// File: src/helpers/swalHelpers.ts
import Swal, { type SweetAlertIcon } from 'sweetalert2';

const getThemeConfig = (isDark: boolean) => ({
    background: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#f9fafb' : '#111827',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: isDark ? '#374151' : '#d1d5db',
});

export const showConfirmation = async (
    title: string,
    text: string,
    isDark: boolean = false,
    icon: SweetAlertIcon = 'warning',
    confirmButtonText: string = 'Yes'
): Promise<boolean> => {
    const result = await Swal.fire({
        title,
        text,
        icon,
        ...getThemeConfig(isDark),
        showCancelButton: true,
        confirmButtonText,
        showCloseButton: true,
    });
    return result.isConfirmed;
};

export const showToast = (
    message: string,
    icon: SweetAlertIcon = 'success',
    isDark: boolean = false
): void => {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        ...getThemeConfig(isDark),
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        },
    });

    Toast.fire({
        icon,
        title: message,
    });
};

// Clickable Toast specifically designed to replace the old blocking modal
export const showClickableToast = (
    title: string,
    pollTitle: string,
    onClickAction: () => void,
    isDark: boolean = false,
    icon: SweetAlertIcon = 'info'
): void => {
    // Construct the stylized HTML right here in the helper
    const htmlContent = `Loaded "${pollTitle}". <br/><span style="color: #a855f7; font-weight: bold; text-decoration: underline; cursor: pointer;">Click here to jump to the form.</span>`;

    Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon,
        title,
        html: htmlContent,
        ...getThemeConfig(isDark),
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        showCloseButton: true,
        customClass: {
            popup: 'cursor-pointer hover:shadow-lg transition-shadow'
        },
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);

            toast.addEventListener('click', () => {
                onClickAction();
                Swal.close();
            });
        }
    });
};