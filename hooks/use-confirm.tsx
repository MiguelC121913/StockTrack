"use client";

import { useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** "destructive" renders the confirm button in red. */
  variant?: "default" | "destructive";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/**
 * Returns a [confirm, ConfirmDialog] tuple.
 *
 * Call `confirm(options)` anywhere in the component; it returns a Promise<boolean>
 * that resolves to true (confirmed) or false (cancelled/dismissed).
 * Render `{ConfirmDialog}` once in the component's JSX.
 *
 * Handles Escape key and backdrop click via the underlying Dialog primitive.
 */
export function useConfirm(): [ConfirmFn, React.ReactNode] {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });

  // useRef avoids the "setState with function-updater" pitfall when storing
  // a Promise resolve callback.
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((res) => {
      setOptions(opts);
      resolveRef.current = res;
      setOpen(true);
    });
  }, []);

  function settle(value: boolean) {
    setOpen(false);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }

  const ConfirmDialog = (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          {options.message && (
            <DialogDescription>{options.message}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {options.cancelText ?? "Cancel"}
          </Button>
          <Button
            variant={options.variant === "destructive" ? "destructive" : "default"}
            onClick={() => settle(true)}
          >
            {options.confirmText ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [confirm, ConfirmDialog];
}
