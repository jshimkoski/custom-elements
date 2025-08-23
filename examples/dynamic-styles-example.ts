import { component, html } from "../src/lib/runtime";

// Example 1: Basic dynamic styling based on state
const ThemeButton = component("theme-button", {
  state: {
    theme: "light" as "light" | "dark",
    size: "medium" as "small" | "medium" | "large",
    disabled: false,
  },

  // Dynamic styles with dependency tracking for optimal performance
  style: {
    css: (state) => `
      :host {
        display: inline-block;
        transition: all 0.2s ease;
      }

      button {
        border: none;
        border-radius: ${state.size === "small" ? "4px" : state.size === "large" ? "12px" : "8px"};
        padding: ${
          state.size === "small" ? "8px 16px" :
          state.size === "large" ? "16px 32px" : "12px 24px"
        };
        font-size: ${
          state.size === "small" ? "14px" :
          state.size === "large" ? "18px" : "16px"
        };
        font-weight: 500;
        cursor: ${state.disabled ? "not-allowed" : "pointer"};
        transition: all 0.2s ease;
        background: ${
          state.theme === "dark"
            ? state.disabled ? "#374151" : "#1f2937"
            : state.disabled ? "#e5e7eb" : "#f3f4f6"
        };
        color: ${
          state.theme === "dark"
            ? state.disabled ? "#6b7280" : "#f9fafb"
            : state.disabled ? "#9ca3af" : "#1f2937"
        };
        border: 2px solid ${
          state.theme === "dark" ? "#374151" : "#d1d5db"
        };
      }

      button:hover:not(:disabled) {
        background: ${
          state.theme === "dark" ? "#374151" : "#e5e7eb"
        };
        transform: translateY(-1px);
        box-shadow: 0 4px 12px ${
          state.theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.1)"
        };
      }

      button:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 6px ${
          state.theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)"
        };
      }

      .icon {
        margin-right: 8px;
        font-size: ${
          state.size === "small" ? "16px" :
          state.size === "large" ? "24px" : "20px"
        };
      }
    `,
    // Only recalculate styles when these specific properties change
    dependencies: ["theme", "size", "disabled"],
    // Enable caching for better performance
    cache: true,
  },

  // Enable style optimizations
  styleOptimizations: {
    enableCaching: true,
    enableMinification: true,
    enableDeduplication: true,
    debounceMs: 16,
  },

  render: (state) => html`
    <button
      ${state.disabled ? 'disabled' : ''}
      onclick=${() => {
        if (!state.disabled) {
          state.theme = state.theme === "light" ? "dark" : "light";
        }
      }}
    >
      <span class="icon">${state.theme === "dark" ? "🌙" : "☀️"}</span>
      Toggle Theme (${state.theme})
    </button>
  `,

  onConnected: (state) => {
    console.log("ThemeButton connected with optimized styling!");
  },
});

// Example 2: Advanced dynamic styling with CSS custom properties
const ProgressBar = component("progress-bar", {
  state: {
    progress: 0,
    color: "#3b82f6",
    animated: true,
    showPercentage: true,
    status: "normal" as "normal" | "warning" | "error" | "success",
  },

  computed: {
    statusColor: (state) => {
      switch (state.status) {
        case "warning": return "#f59e0b";
        case "error": return "#ef4444";
        case "success": return "#10b981";
        default: return state.color;
      }
    },

    progressPercentage: (state) => Math.min(100, Math.max(0, state.progress)),
  },

  // Complex dynamic styling with CSS animations
  style: {
    css: (state) => `
      :host {
        --progress-color: ${state.statusColor};
        --progress-percentage: ${state.progressPercentage}%;
        --animation-duration: ${state.animated ? "0.3s" : "0s"};

        display: block;
        width: 100%;
        margin: 16px 0;
      }

      .progress-container {
        position: relative;
        background: #e5e7eb;
        border-radius: 8px;
        height: 24px;
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
      }

      .progress-bar {
        height: 100%;
        width: var(--progress-percentage);
        background: var(--progress-color);
        border-radius: 8px;
        transition: width var(--animation-duration) ease-out,
                    background-color var(--animation-duration) ease;
        position: relative;
        overflow: hidden;
      }

      .progress-bar::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          45deg,
          rgba(255,255,255,0.2) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255,255,255,0.2) 50%,
          rgba(255,255,255,0.2) 75%,
          transparent 75%,
          transparent
        );
        background-size: 20px 20px;
        animation: ${state.animated ? "progress-stripe 1s linear infinite" : "none"};
      }

      .progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: 600;
        color: ${state.progressPercentage > 50 ? "white" : "#374151"};
        text-shadow: ${state.progressPercentage > 50 ? "0 1px 2px rgba(0,0,0,0.3)" : "none"};
        z-index: 10;
        transition: color var(--animation-duration) ease;
      }

      .status-indicator {
        display: inline-block;
        margin-right: 8px;
        font-size: 16px;
      }

      @keyframes progress-stripe {
        0% { background-position-x: 0; }
        100% { background-position-x: 20px; }
      }

      /* Pulsing animation for active progress */
      ${state.animated && state.progressPercentage > 0 && state.progressPercentage < 100 ? `
        .progress-bar {
          animation: progress-pulse 2s ease-in-out infinite alternate;
        }

        @keyframes progress-pulse {
          0% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      ` : ""}

      /* Success celebration animation */
      ${state.status === "success" && state.progressPercentage >= 100 ? `
        .progress-bar {
          animation: progress-success 0.6s ease-out;
        }

        @keyframes progress-success {
          0% { transform: scaleY(1); }
          50% { transform: scaleY(1.1); }
          100% { transform: scaleY(1); }
        }
      ` : ""}
    `,
    // Track all relevant dependencies
    dependencies: ["progress", "color", "animated", "status", "statusColor", "progressPercentage"],
    cache: true,
  },

  styleOptimizations: {
    enableCaching: true,
    enableMinification: false, // Keep readable for debugging
    enableDeduplication: true,
    debounceMs: 8, // Faster updates for smooth animations
  },

  render: (state) => html`
    <div class="progress-container">
      <div class="progress-bar"></div>
      ${state.showPercentage ? html`
        <div class="progress-text">
          <span class="status-indicator">
            ${state.status === "warning" ? "⚠️" :
              state.status === "error" ? "❌" :
              state.status === "success" ? "✅" : "📊"}
          </span>
          ${Math.round(state.progressPercentage)}%
        </div>
      ` : ""}
    </div>
  `,

  // Animation control methods
  startProgress: (state) => {
    state.animated = true;
    state.status = "normal";
  },

  completeProgress: (state) => {
    state.progress = 100;
    state.status = "success";
    setTimeout(() => {
      state.animated = false;
    }, 600);
  },

  setError: (state) => {
    state.status = "error";
    state.animated = false;
  },

  reset: (state) => {
    state.progress = 0;
    state.status = "normal";
    state.animated = true;
  },
});

// Example 3: Card component with theme system and responsive styles
const DynamicCard = component("dynamic-card", {
  state: {
    title: "Dynamic Card",
    content: "This card adapts its styling based on state changes.",
    variant: "default" as "default" | "primary" | "success" | "warning" | "danger",
    elevation: 2,
    expanded: false,
    loading: false,
  },

  // Advanced styling with responsive design and theme variants
  style: {
    css: (state) => `
      :host {
        display: block;
        margin: 16px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .card {
        border-radius: 12px;
        padding: ${state.expanded ? "32px" : "24px"};
        background: white;
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        /* Dynamic elevation */
        box-shadow: ${
          state.elevation === 1 ? "0 1px 3px rgba(0,0,0,0.12)" :
          state.elevation === 2 ? "0 4px 6px rgba(0,0,0,0.1)" :
          state.elevation === 3 ? "0 10px 15px rgba(0,0,0,0.1)" :
          "0 20px 25px rgba(0,0,0,0.15)"
        };

        /* Variant-based border and accents */
        border: 2px solid ${
          state.variant === "primary" ? "#3b82f6" :
          state.variant === "success" ? "#10b981" :
          state.variant === "warning" ? "#f59e0b" :
          state.variant === "danger" ? "#ef4444" :
          "#e5e7eb"
        };

        border-left: 6px solid ${
          state.variant === "primary" ? "#3b82f6" :
          state.variant === "success" ? "#10b981" :
          state.variant === "warning" ? "#f59e0b" :
          state.variant === "danger" ? "#ef4444" :
          "#6b7280"
        };
      }

      .card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg,
          ${state.variant === "primary" ? "#3b82f6, #1d4ed8" :
            state.variant === "success" ? "#10b981, #059669" :
            state.variant === "warning" ? "#f59e0b, #d97706" :
            state.variant === "danger" ? "#ef4444, #dc2626" :
            "#6b7280, #4b5563"}
        );
        opacity: ${state.variant === "default" ? 0 : 1};
        transition: opacity 0.3s ease;
      }

      .card-header {
        margin-bottom: ${state.expanded ? "24px" : "16px"};
        transition: margin 0.3s ease;
      }

      .card-title {
        font-size: ${state.expanded ? "24px" : "20px"};
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 8px 0;
        transition: font-size 0.3s ease;
      }

      .card-content {
        color: #6b7280;
        line-height: 1.6;
        margin-bottom: ${state.expanded ? "24px" : "16px"};
        max-height: ${state.expanded ? "none" : "100px"};
        overflow: ${state.expanded ? "visible" : "hidden"};
        transition: all 0.3s ease;
      }

      .card-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      button {
        padding: 8px 16px;
        border-radius: 6px;
        border: 1px solid transparent;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-expand {
        background: ${state.variant === "default" ? "#f3f4f6" : "transparent"};
        color: ${
          state.variant === "primary" ? "#3b82f6" :
          state.variant === "success" ? "#10b981" :
          state.variant === "warning" ? "#f59e0b" :
          state.variant === "danger" ? "#ef4444" :
          "#6b7280"
        };
        border-color: currentColor;
      }

      .btn-expand:hover {
        background: ${
          state.variant === "primary" ? "#eff6ff" :
          state.variant === "success" ? "#ecfdf5" :
          state.variant === "warning" ? "#fffbeb" :
          state.variant === "danger" ? "#fef2f2" :
          "#e5e7eb"
        };
      }

      /* Loading state */
      ${state.loading ? `
        .card {
          pointer-events: none;
          opacity: 0.7;
        }

        .card::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.6),
            transparent
          );
          animation: loading-shimmer 1.5s infinite;
        }

        @keyframes loading-shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      ` : ""}

      /* Responsive design */
      @media (max-width: 640px) {
        :host {
          margin: 8px;
        }

        .card {
          padding: ${state.expanded ? "24px 16px" : "16px"};
        }

        .card-title {
          font-size: ${state.expanded ? "20px" : "18px"};
        }

        .card-actions {
          flex-direction: column;
          gap: 8px;
        }
      }
    `,
    dependencies: ["variant", "elevation", "expanded", "loading"],
    cache: true,
  },

  styleOptimizations: {
    enableCaching: true,
    enableMinification: true,
    enableDeduplication: true,
    debounceMs: 16,
  },

  render: (state) => html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${state.title}</h3>
      </div>

      <div class="card-content">
        ${state.content}
        ${state.expanded ? html`
          <p>This is additional content that's only visible when the card is expanded.
          The styling adapts dynamically based on the expanded state, changing padding,
          font sizes, and spacing for the best user experience.</p>
        ` : ""}
      </div>

      <div class="card-actions">
        <button
          class="btn-expand"
          onclick=${() => state.expanded = !state.expanded}
        >
          ${state.expanded ? "Collapse" : "Expand"}
        </button>

        <button
          onclick=${() => {
            const variants: Array<typeof state.variant> =
              ["default", "primary", "success", "warning", "danger"];
            const currentIndex = variants.indexOf(state.variant);
            state.variant = variants[(currentIndex + 1) % variants.length];
          }}
        >
          Change Variant
        </button>

        <button
          onclick=${() => {
            state.loading = true;
            setTimeout(() => {
              state.elevation = state.elevation === 4 ? 1 : state.elevation + 1;
              state.loading = false;
            }, 1000);
          }}
        >
          Change Elevation
        </button>
      </div>
    </div>
  `,

  onConnected: (state) => {
    console.log("DynamicCard connected with theme:", state.variant);
  },
});

// Usage example
export function createExampleApp() {
  document.body.innerHTML = `
    <h1>Dynamic Styling Examples</h1>

    <section>
      <h2>1. Theme Button with Size Variants</h2>
      <div style="display: flex; gap: 16px; margin: 16px 0;">
        <theme-button></theme-button>
      </div>
    </section>

    <section>
      <h2>2. Animated Progress Bar</h2>
      <progress-bar></progress-bar>
      <div style="margin: 16px 0;">
        <button onclick="simulateProgress()">Simulate Progress</button>
        <button onclick="setProgressError()">Set Error</button>
        <button onclick="resetProgress()">Reset</button>
      </div>
    </section>

    <section>
      <h2>3. Dynamic Cards</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
        <dynamic-card></dynamic-card>
        <dynamic-card></dynamic-card>
      </div>
    </section>
  `;

  // Set up interactions
  (window as any).simulateProgress = () => {
    const progressBar = document.querySelector('progress-bar') as any;
    if (progressBar) {
      progressBar.startProgress();
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        progressBar.progress = progress;

        if (progress >= 100) {
          clearInterval(interval);
          progressBar.completeProgress();
        }
      }, 200);
    }
  };

  (window as any).setProgressError = () => {
    const progressBar = document.querySelector('progress-bar') as any;
    if (progressBar) {
      progressBar.setError();
    }
  };

  (window as any).resetProgress = () => {
    const progressBar = document.querySelector('progress-bar') as any;
    if (progressBar) {
      progressBar.reset();
    }
  };

  // Initialize with different variants
  setTimeout(() => {
    const cards = document.querySelectorAll('dynamic-card');
    if (cards[1]) {
      (cards[1] as any).variant = 'primary';
      (cards[1] as any).title = 'Primary Card';
      (cards[1] as any).elevation = 3;
    }
  }, 100);
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createExampleApp);
  } else {
    createExampleApp();
  }
}
