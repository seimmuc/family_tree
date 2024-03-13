declare type FileDropEvent = import('filedrop-svelte/event').FileDropEvent;
declare type FileDropSelectEvent = import('filedrop-svelte/event').FileDropSelectEvent;
declare type FileDropDragEvent = import('filedrop-svelte/event').FileDropDragEvent;
declare namespace svelteHTML {
  interface HTMLAttributes<T> {
    'on:filedrop'?: (event: CustomEvent<FileDropSelectEvent> & { target: EventTarget & T }) => void;
    'on:filedragenter'?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
    'on:filedragleave'?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
    'on:filedragover'?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
    'on:filedialogcancel'?: (event: CustomEvent<FileDropEvent> & { target: EventTarget & T }) => void;
    'on:filedialogclose'?: (event: CustomEvent<FileDropEvent> & { target: EventTarget & T }) => void;
    'on:filedialogopen'?: (event: CustomEvent<FileDropEvent> & { target: EventTarget & T }) => void;
    'on:windowfiledragenter'?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
    'on:windowfiledragleave'?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
    'on:windowfiledragover'?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
  }
}
