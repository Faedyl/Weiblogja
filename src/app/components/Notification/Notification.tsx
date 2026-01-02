'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import styles from './Notification.module.css';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
	isOpen: boolean;
	message: string;
	type?: NotificationType;
	duration?: number;
	onClose: () => void;
}

export default function Notification({
	isOpen,
	message,
	type = 'info',
	duration = 5000,
	onClose,
}: NotificationProps) {
	useEffect(() => {
		if (isOpen && duration > 0) {
			const timer = setTimeout(() => {
				onClose();
			}, duration);

			return () => clearTimeout(timer);
		}
	}, [isOpen, duration, onClose]);

	if (!isOpen) return null;

	const getIcon = () => {
		switch (type) {
			case 'success':
				return <CheckCircle size={20} />;
			case 'error':
				return <AlertCircle size={20} />;
			case 'warning':
				return <AlertTriangle size={20} />;
			case 'info':
			default:
				return <Info size={20} />;
		}
	};

	return (
		<div className={`${styles.notification} ${styles[type]}`}>
			<div className={styles.iconContainer}>
				{getIcon()}
			</div>
			<div className={styles.messageContainer}>
				<p className={styles.message}>{message}</p>
			</div>
			<button
				onClick={onClose}
				className={styles.closeButton}
				aria-label="Close notification"
			>
				<X size={18} />
			</button>
		</div>
	);
}
