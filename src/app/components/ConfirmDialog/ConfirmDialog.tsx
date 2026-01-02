'use client';

import { X, AlertTriangle } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
	isOpen,
	title,
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	onConfirm,
	onCancel,
	variant = 'danger',
}: ConfirmDialogProps) {
	if (!isOpen) return null;

	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	};

	return (
		<div className={styles.overlay} onClick={handleBackdropClick}>
			<div className={styles.dialog}>
				<div className={styles.dialogHeader}>
					<div className={styles.dialogTitleContainer}>
						<AlertTriangle 
							size={24} 
							className={`${styles.icon} ${styles[variant]}`}
						/>
						<h3 className={styles.dialogTitle}>{title}</h3>
					</div>
					<button
						onClick={onCancel}
						className={styles.closeButton}
						aria-label="Close dialog"
					>
						<X size={20} />
					</button>
				</div>
				<div className={styles.dialogBody}>
					<p className={styles.dialogMessage}>{message}</p>
				</div>
				<div className={styles.dialogFooter}>
					<button
						onClick={onCancel}
						className={styles.cancelButton}
					>
						{cancelText}
					</button>
					<button
						onClick={onConfirm}
						className={`${styles.confirmButton} ${styles[variant]}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}
