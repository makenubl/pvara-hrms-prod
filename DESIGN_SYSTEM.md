# PVARA HRMS - Premium Glassmorphism Design System

## Page Header
```jsx
<h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
  Page Title
</h1>
<p className="text-slate-400 mt-2">Subtitle/Description</p>
```

## Premium Glass Card
```jsx
<div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
  {/* Content */}
</div>
```

## Stat Card
```jsx
<div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-cyan-400/50 transition-all group">
  <p className="text-slate-400 text-sm font-medium">Label</p>
  <p className="text-3xl font-black text-white mt-2">Value</p>
</div>
```

## Premium Button (Primary)
```jsx
<button className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all flex items-center gap-2">
  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
  <span className="relative">Button Text</span>
</button>
```

## Input Field
```jsx
<input
  type="text"
  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 transition-all"
  placeholder="Placeholder..."
/>
```

## Select Dropdown
```jsx
<select className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all">
  <option className="bg-slate-900">Option</option>
</select>
```

## Action Icon Button
```jsx
<button className="p-2 hover:bg-blue-500/20 hover:border-blue-400/50 border border-transparent rounded-lg transition-all">
  <Icon size={16} className="text-blue-400" />
</button>
```

## Color Palette
- **Primary**: Cyan (#06b6d4), Blue (#3b82f6), Purple (#8b5cf6)
- **Success**: Green (#10b981)
- **Warning**: Amber (#fbbf24)
- **Error**: Red (#ef4444)
- **Text Primary**: White / Slate-200
- **Text Secondary**: Slate-400 / Slate-300
- **Borders**: white/10 to white/30 for glass effect
