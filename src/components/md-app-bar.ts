import {
  component,
  html,
  css,
  useProps,
  useEmit,
  useStyle,
  ref,
  computed,
  useOnConnected,
  useOnDisconnected,
  watch,
} from '../lib/index.js';

component('md-app-bar', () => {
  const props = useProps({
    variant: 'small' as 'small' | 'medium' | 'large' | 'center',
    title: '',
    leadingIcon: 'menu',
    trailingIcons: [] as string[],
  });

  const emit = useEmit();

  const collapsed = ref(false);
  const pendingCollapsed = ref<null | boolean>(null);
  const isCollapsible = computed(
    () => props.variant === 'medium' || props.variant === 'large',
  );

  const isAnimating = ref(false);
  watch(collapsed, () => {
    isAnimating.value = true;

    setTimeout(() => {
      isAnimating.value = false;

      if (
        typeof pendingCollapsed.value === 'boolean' &&
        pendingCollapsed.value !== collapsed.value
      ) {
        const target = pendingCollapsed.value;
        pendingCollapsed.value = null;
        collapsed.value = target;
      } else {
        pendingCollapsed.value = null;
      }
    }, 220);
  });

  const onScroll = () => {
    const nextCollapsed = isCollapsible.value && window.scrollY > 0;

    if (isAnimating.value) {
      // defer updates while animation is still active to avoid frame jitter,
      // but remember the final desired state to apply after the current animation.
      pendingCollapsed.value = nextCollapsed;
      console.log('onScroll deferred', nextCollapsed);
      return;
    }

    if (collapsed.value === nextCollapsed) return;

    pendingCollapsed.value = null;
    collapsed.value = nextCollapsed;
    console.log('onScroll', collapsed.value);
  };

  useOnConnected(() => {
    onScroll();
    window.addEventListener('scroll', onScroll);
  });

  useOnDisconnected(() => {
    window.removeEventListener('scroll', onScroll);
  });

  const safeTrailingIcons = computed(() =>
    Array.isArray(props.trailingIcons) ? props.trailingIcons : [],
  );

  useStyle(
    () => css`
      :host {
        display: block;
      }

      /* ── Base bar ────────────────────────────────────────────────── */
      .app-bar {
        background: var(--md-sys-color-surface, #fffbfe);
        border: 1px solid var(--md-sys-color-outline, #e0e0e0);
        width: 100%;
        overflow: hidden;
        position: relative;
        isolation: isolate;
        transition:
          height 200ms cubic-bezier(0.4, 0, 0.2, 1),
          box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
        will-change: height, box-shadow;
      }

      /* ── Elevation lift on scroll (all variants) ─────────────────── */
      /* The background colour change uses a ::before overlay animated
     * via opacity rather than background-color. Opacity is GPU-
     * composited (no repaint) so it cannot flicker alongside the
     * simultaneous height transition on medium/large variants.
     * isolation: isolate on .app-bar keeps z-index: -1 contained.  */
      .app-bar::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--md-sys-color-surface-container, #ece6f0);
        opacity: 0;
        will-change: opacity;
        transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        z-index: -1;
      }
      .app-bar.collapsed::before {
        opacity: 1;
      }
      .app-bar.collapsed {
        box-shadow:
          0 1px 2px 0 rgba(0, 0, 0, 0.3),
          0 2px 6px 2px rgba(0, 0, 0, 0.15);
      }

      .app-bar.small,
      .app-bar.center {
        height: 64px;
        display: flex;
        align-items: center;
      }
      .app-bar.center {
        justify-content: center;
      }

      .app-bar.medium {
        height: 112px;
        display: flex;
        flex-direction: column;
      }
      .app-bar.large {
        height: 152px;
        display: flex;
        flex-direction: column;
      }

      .app-bar.collapsed.medium,
      .app-bar.collapsed.large {
        height: 64px;
      }

      .top-row {
        height: 64px;
        display: flex;
        align-items: center;
        padding: 0 8px;
        box-sizing: border-box;
        width: 100%;
      }

      .title-area {
        position: absolute;
        left: 18px;
        top: 78px;
      }
      .title {
        font-size: 22px;
        line-height: 28px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 4px;
      }
      .app-bar.medium .title {
        font-size: 24px;
      }
      .app-bar.large .title {
        font-size: 28px;
      }
      .app-bar.collapsed.medium .title-area {
        top: 50%;
        left: 56px;
        transform: translateY(-50%);
      }
      .app-bar.collapsed.large .title-area {
        top: 50%;
        left: 56px;
        transform: translateY(-50%);
      }
      .app-bar.collapsed.medium .title {
        font-size: 22px;
      }
      .app-bar.collapsed.large .title {
        font-size: 22px;
      }

      /* ── Icon button ─────────────────────────────────────────────── */
      .icon-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: transparent;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--md-sys-color-on-surface, #1c1b1f);
        outline: none;
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }
      .icon-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: var(--md-sys-color-on-surface, #1c1b1f);
        opacity: 0;
        transition: opacity 200ms;
      }
      .icon-btn:hover::before {
        opacity: 0.08;
      }
      .icon-btn:focus::before {
        opacity: 0.12;
      }
      .icon-btn:active::before {
        opacity: 0.12;
      }

      .nav-icon,
      .action-icon {
        font-family: 'Material Symbols Outlined';
        font-size: 24px;
        font-weight: normal;
        font-style: normal;
        line-height: 1;
        font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 24;
        user-select: none;
      }

      .trailing-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
    `,
  );

  return html`
    <header
      :class="${{
        'app-bar': true,
        [props.variant]: true,
        collapsed: collapsed.value,
      }}"
    >
      <div class="top-row">
        ${collapsed.value}
        <button
          :when="${!!props.leadingIcon}"
          type="button"
          class="icon-btn"
          aria-label="Navigation"
          @click="${() => emit('nav')}"
        >
          <span class="nav-icon" aria-hidden="true">${props.leadingIcon}</span>
        </button>

        <div class="trailing-actions">
          <slot name="trailing"></slot>
          ${safeTrailingIcons.value.map(
            (icon: string) => html`
              <button
                type="button"
                class="icon-btn"
                aria-label="${icon}"
                @click="${() => emit('action', icon)}"
              >
                <span class="action-icon" aria-hidden="true">${icon}</span>
              </button>
            `,
          )}
        </div>
      </div>

      <div class="title-area">
        <span class="title">${props.title}<slot name="title"></slot></span>
      </div>
    </header>
  `;
});
