import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { cn } from '@/lib/utils';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ defaultOpen = true, open: openProp, onOpenChange, className, style, children, ...props }, ref) => {
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        _setOpen(value);
      }
    },
    [onOpenChange],
  );

  const contextValue = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn('group/sidebar-wrapper flex min-h-svh w-full bg-studio-bg text-studio-text', className)}
        style={
          {
            '--sidebar-width': '17rem',
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
});
SidebarProvider.displayName = 'SidebarProvider';

const Sidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(
        'flex h-svh w-[--sidebar-width] shrink-0 flex-col border-r border-studio-border bg-white',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  ),
);
Sidebar.displayName = 'Sidebar';

const SidebarInset = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <main ref={ref} className={cn('min-w-0 flex-1', className)} {...props} />
  ),
);
SidebarInset.displayName = 'SidebarInset';

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-b border-studio-border p-3', className)} {...props} />
  ),
);
SidebarHeader.displayName = 'SidebarHeader';

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('min-h-0 flex-1 overflow-auto p-2', className)} {...props} />
  ),
);
SidebarContent.displayName = 'SidebarContent';

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-t border-studio-border p-3', className)} {...props} />
  ),
);
SidebarFooter.displayName = 'SidebarFooter';

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    const { open, setOpen } = useSidebar();

    return (
      <button
        ref={ref}
        aria-label="Toggle sidebar"
        className={cn('sr-only', className)}
        data-ui="sidebar-rail"
        onClick={() => setOpen(!open)}
        type="button"
        {...props}
      />
    );
  },
);
SidebarRail.displayName = 'SidebarRail';

const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    const { open, setOpen } = useSidebar();

    return (
      <button
        ref={ref}
        aria-label="Toggle sidebar"
        className={cn('inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100', className)}
        data-ui="sidebar-trigger"
        onClick={() => setOpen(!open)}
        type="button"
        {...props}
      >
        <span aria-hidden="true">Menu</span>
      </button>
    );
  },
);
SidebarTrigger.displayName = 'SidebarTrigger';

const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('grid gap-1', className)} {...props} />,
);
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-studio-muted', className)}
      {...props}
    />
  ),
);
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('grid gap-1', className)} {...props} />,
);
SidebarGroupContent.displayName = 'SidebarGroupContent';

const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('grid list-none gap-1 p-0 m-0', className)} {...props} />
  ),
);
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('relative', className)} {...props} />,
);
SidebarMenuItem.displayName = 'SidebarMenuItem';

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    isActive?: boolean;
  }
>(({ asChild = false, isActive = false, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      ref={ref}
      className={cn(
        'flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent',
        isActive && 'bg-orange-50 text-studio-text ring-1 ring-orange-200',
        className,
      )}
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
      data-ui="sidebar-menu-button"
      {...props}
    />
  );
});
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn('ml-4 grid list-none gap-1 border-l border-studio-border pl-2 py-1', className)}
      {...props}
    />
  ),
);
SidebarMenuSub.displayName = 'SidebarMenuSub';

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('relative', className)} {...props} />,
);
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';

const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }
>(({ className, isActive = false, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-studio-muted transition-colors hover:bg-slate-100 hover:text-studio-text',
      isActive && 'bg-orange-50 text-studio-text ring-1 ring-orange-200',
      className,
    )}
    data-active={isActive}
    aria-current={isActive ? 'page' : undefined}
    data-ui="sidebar-menu-sub-button"
    type="button"
    {...props}
  />
));
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.66rem] font-semibold text-studio-muted', className)}
      {...props}
    />
  ),
);
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
};
