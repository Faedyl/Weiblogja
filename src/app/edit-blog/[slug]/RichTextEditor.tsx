'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { 
	Bold, 
	Italic, 
	List, 
	ListOrdered, 
	Quote, 
	Undo, 
	Redo, 
	Heading1, 
	Heading2, 
	Heading3,
	Code,
	Link as LinkIcon,
	UnlinkIcon,
	ImageIcon
} from 'lucide-react';
import { useCallback } from 'react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
	content: string;
	onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Placeholder.configure({
				placeholder: 'Start writing your blog content...',
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					target: '_blank',
					rel: 'noopener noreferrer',
				},
			}),
			Image.configure({
				inline: false,
				allowBase64: true,
				HTMLAttributes: {
					class: 'blog-image',
				},
			}),
		],
		content,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		editorProps: {
			attributes: {
				class: styles.editorContent,
			},
		},
	});

	const setLink = useCallback(() => {
		if (!editor) return;

		const previousUrl = editor.getAttributes('link').href;
		const url = window.prompt('Enter URL:', previousUrl);

		if (url === null) return;

		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}

		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	}, [editor]);

	const addImage = useCallback(() => {
		if (!editor) return;

		const url = window.prompt('Enter image URL:');

		if (url) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	}, [editor]);

	const getWordCount = () => {
		if (!editor) return 0;
		const text = editor.getText();
		return text.split(/\s+/).filter(word => word.length > 0).length;
	};

	const getCharacterCount = () => {
		if (!editor) return 0;
		return editor.getText().length;
	};

	if (!editor) {
		return null;
	}

	return (
		<div className={styles.editorWrapper}>
			<div className={styles.toolbar}>
				<div className={styles.toolbarGroup}>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleBold().run()}
						className={editor.isActive('bold') ? styles.active : ''}
						title="Bold (Ctrl+B)"
					>
						<Bold size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleItalic().run()}
						className={editor.isActive('italic') ? styles.active : ''}
						title="Italic (Ctrl+I)"
					>
						<Italic size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleCode().run()}
						className={editor.isActive('code') ? styles.active : ''}
						title="Code"
					>
						<Code size={18} />
					</button>
				</div>

				<div className={styles.toolbarDivider} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
						className={editor.isActive('heading', { level: 1 }) ? styles.active : ''}
						title="Heading 1"
					>
						<Heading1 size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
						className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}
						title="Heading 2"
					>
						<Heading2 size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
						className={editor.isActive('heading', { level: 3 }) ? styles.active : ''}
						title="Heading 3"
					>
						<Heading3 size={18} />
					</button>
				</div>

				<div className={styles.toolbarDivider} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						className={editor.isActive('bulletList') ? styles.active : ''}
						title="Bullet List"
					>
						<List size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						className={editor.isActive('orderedList') ? styles.active : ''}
						title="Numbered List"
					>
						<ListOrdered size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
						className={editor.isActive('blockquote') ? styles.active : ''}
						title="Quote"
					>
						<Quote size={18} />
					</button>
				</div>

				<div className={styles.toolbarDivider} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						onClick={setLink}
						className={editor.isActive('link') ? styles.active : ''}
						title="Add Link"
					>
						<LinkIcon size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().unsetLink().run()}
						disabled={!editor.isActive('link')}
						title="Remove Link"
					>
						<UnlinkIcon size={18} />
					</button>
					<button
						type="button"
						onClick={addImage}
						title="Insert Image"
					>
						<ImageIcon size={18} />
					</button>
				</div>

				<div className={styles.toolbarDivider} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						onClick={() => editor.chain().focus().undo().run()}
						disabled={!editor.can().undo()}
						title="Undo (Ctrl+Z)"
					>
						<Undo size={18} />
					</button>
					<button
						type="button"
						onClick={() => editor.chain().focus().redo().run()}
						disabled={!editor.can().redo()}
						title="Redo (Ctrl+Y)"
					>
						<Redo size={18} />
					</button>
				</div>
			</div>

			<EditorContent editor={editor} className={styles.editor} />

			<div className={styles.editorFooter}>
				<div className={styles.stats}>
					<span className={styles.stat}>
						<strong>{getWordCount()}</strong> words
					</span>
					<span className={styles.statDivider}>•</span>
					<span className={styles.stat}>
						<strong>{getCharacterCount()}</strong> characters
					</span>
				</div>
			</div>
		</div>
	);
}
