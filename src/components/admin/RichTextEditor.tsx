import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Unlink,
  Code,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolBtn({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-7 w-7 grid place-items-center rounded transition ${
        active
          ? "bg-[#d4af37] text-black"
          : "text-[#f5d97a] hover:bg-[#d4af37]/20"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url, target: "_blank" })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-[#d4af37]/30 bg-black/30 rounded-t-lg sticky top-0 z-10">
      <ToolBtn
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Strike"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="w-px h-5 bg-[#d4af37]/30 mx-1" />
      <ToolBtn
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="w-px h-5 bg-[#d4af37]/30 mx-1" />
      <ToolBtn
        title="Bullet List"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Numbered List"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="w-px h-5 bg-[#d4af37]/30 mx-1" />
      <ToolBtn
        title="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        title="Remove Link"
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Unlink className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="w-px h-5 bg-[#d4af37]/30 mx-1" />
      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-3.5 w-3.5" />
      </ToolBtn>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Likhna shuru karein..." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "ko-rte prose prose-sm max-w-none min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
  });

  // Sync external value changes (e.g., switching pages)
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[360px] rounded-lg bg-[#fffdf5] border border-[#d4af37]/40" />
    );
  }

  return (
    <div className="rounded-lg bg-[#fffdf5] border border-[#d4af37]/40 overflow-hidden shadow-inner">
      <Toolbar editor={editor} />
      <style>{`
        .ko-rte, .ko-rte * { color: #1a1208 !important; }
        .ko-rte h1, .ko-rte h2, .ko-rte h3, .ko-rte h4 { color: #6b3a00 !important; font-weight: 700; }
        .ko-rte strong { color: #6b3a00 !important; font-weight: 700; }
        .ko-rte em { color: #2d1f0a !important; }
        .ko-rte a { color: #b45309 !important; text-decoration: underline; }
        .ko-rte blockquote { border-left: 3px solid #d4af37; color: #4b3a1a !important; background: #fff8e1; padding: 6px 12px; }
        .ko-rte code { background: #fff3c4; color: #6b3a00 !important; padding: 1px 6px; border-radius: 4px; }
        .ko-rte ul, .ko-rte ol { padding-left: 1.4em; }
        .ko-rte li { color: #1a1208 !important; }
        .ko-rte p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9a7b3a;
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  );
}
