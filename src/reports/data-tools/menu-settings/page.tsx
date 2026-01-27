import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  ArrowRightLeft,
  Building,
  Wrench,
  BarChart3,
  Settings,
} from 'lucide-react';

// Menu structure matching Layout.tsx
const menuStructure = [
  {
    category: 'Main',
    items: [
      { name: 'Main Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Report Catalog', href: '/reports', icon: FolderOpen },
    ],
  },
  {
    category: '2025 Performance',
    icon: BarChart3,
    basePath: '/sales-2025',
    items: [
      { name: 'Sales Performance', href: '/sales-2025/performance' },
      { name: 'Marketing Performance', href: '/sales-2025/marketing' },
      { name: 'BUD-Head / MGR Performance', href: '/sales-2025/employees' },
    ],
  },
  {
    category: 'Sales Reports',
    icon: TrendingUp,
    basePath: '/sales',
    items: [
      { name: 'Overview', href: '/sales' },
      { name: 'Sales Pipeline', href: '/sales/pipeline' },
      { name: 'Channel Performance', href: '/sales/channel' },
      { name: 'Lead Quality', href: '/sales/leads' },
    ],
  },
  {
    category: 'Transfer Reports',
    icon: ArrowRightLeft,
    basePath: '/transfer',
    items: [
      { name: 'Overview', href: '/transfer' },
      { name: 'Transfer Aging', href: '/transfer/aging' },
      { name: 'Transfer Status', href: '/transfer/status' },
    ],
  },
  {
    category: 'Common Fee Reports',
    icon: Building,
    basePath: '/reports/common-fee',
    items: [
      { name: 'Overview', href: '/reports/common-fee' },
      { name: 'Project Overview', href: '/reports/common-fee/overview' },
      { name: 'Aging Report', href: '/reports/common-fee/aging' },
      { name: 'ตั้งค่า', href: '/reports/common-fee/settings' },
    ],
  },
  {
    category: 'Quality Reports',
    icon: Wrench,
    basePath: '/quality',
    items: [
      { name: 'ภาพรวม', href: '/quality' },
      { name: 'รายการงานทั้งหมด', href: '/quality/requests' },
      { name: 'ตามกลุ่มความรับผิดชอบ', href: '/quality/by-responsible' },
      { name: 'Aging Report', href: '/quality/aging' },
      { name: 'ประสิทธิภาพผู้รับเหมา', href: '/quality/contractor' },
      { name: 'งานผิดปกติ', href: '/quality/exception' },
      { name: 'ตั้งค่า', href: '/quality/settings' },
    ],
  },
  {
    category: 'Data Tools',
    icon: Settings,
    basePath: '/data-tools',
    items: [
      { name: 'Excel Import', href: '/data-tools/excel-import' },
      { name: 'Menu Settings', href: '/data-tools/menu-settings' },
    ],
  },
];

const STORAGE_KEY = 'menu-visibility';

interface MenuVisibility {
  hiddenCategories: string[];
  hiddenItems: string[];
}

export function MenuSettingsPage() {
  const navigate = useNavigate();
  const [visibility, setVisibility] = useState<MenuVisibility>({
    hiddenCategories: [],
    hiddenItems: [],
  });
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setVisibility(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse menu visibility settings');
      }
    }
  }, []);

  const toggleCategory = (category: string) => {
    setVisibility((prev) => {
      const isHidden = prev.hiddenCategories.includes(category);
      return {
        ...prev,
        hiddenCategories: isHidden
          ? prev.hiddenCategories.filter((c) => c !== category)
          : [...prev.hiddenCategories, category],
      };
    });
    setHasChanges(true);
    setSaved(false);
  };

  const toggleItem = (href: string) => {
    setVisibility((prev) => {
      const isHidden = prev.hiddenItems.includes(href);
      return {
        ...prev,
        hiddenItems: isHidden
          ? prev.hiddenItems.filter((h) => h !== href)
          : [...prev.hiddenItems, href],
      };
    });
    setHasChanges(true);
    setSaved(false);
  };

  const isCategoryVisible = (category: string) => {
    return !visibility.hiddenCategories.includes(category);
  };

  const isItemVisible = (href: string) => {
    return !visibility.hiddenItems.includes(href);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
    setSaved(true);
    setHasChanges(false);

    // Dispatch custom event to notify Layout
    window.dispatchEvent(new CustomEvent('menu-visibility-changed'));
  };

  const handleReset = () => {
    setVisibility({ hiddenCategories: [], hiddenItems: [] });
    setHasChanges(true);
    setSaved(false);
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Menu Settings" subtitle="จัดการการแสดงผล Menu" />

      <div className="p-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">กลับหน้าหลัก</span>
        </button>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">บันทึกแล้ว</span>
              </div>
            )}
            {hasChanges && !saved && (
              <span className="text-sm text-amber-600">มีการเปลี่ยนแปลง</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              รีเซ็ต
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              บันทึก
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {menuStructure.map((section, idx) => {
            const Icon = section.icon || LayoutDashboard;
            const categoryVisible = isCategoryVisible(section.category);

            return (
              <div
                key={section.category}
                className={`${idx > 0 ? 'border-t border-slate-200' : ''}`}
              >
                {/* Category Header */}
                <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        categoryVisible ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-semibold ${categoryVisible ? 'text-slate-800' : 'text-slate-400'}`}>
                        {section.category}
                      </p>
                      <p className="text-xs text-slate-500">{section.items.length} items</p>
                    </div>
                  </div>
                  {section.basePath && (
                    <button
                      onClick={() => toggleCategory(section.category)}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        categoryVisible
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      {categoryVisible ? (
                        <>
                          <Eye className="w-4 h-4" />
                          แสดง
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          ซ่อน
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {section.items.map((item) => {
                    const itemVisible = isItemVisible(item.href);
                    const ItemIcon = 'icon' in item ? item.icon : null;

                    return (
                      <div
                        key={item.href}
                        className="px-6 py-3 flex items-center justify-between hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          {ItemIcon && <ItemIcon className="w-4 h-4 text-slate-400" />}
                          <span className={itemVisible ? 'text-slate-700' : 'text-slate-400 line-through'}>
                            {item.name}
                          </span>
                          <span className="text-xs text-slate-400">{item.href}</span>
                        </div>
                        <button
                          onClick={() => toggleItem(item.href)}
                          className={`p-2 rounded-lg transition-colors ${
                            itemVisible
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {itemVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            <strong>หมายเหตุ:</strong> การเปลี่ยนแปลงจะมีผลหลังจากบันทึกและ Refresh หน้า Sidebar จะอัปเดตตามการตั้งค่า
          </p>
        </div>
      </div>
    </div>
  );
}
