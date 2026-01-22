import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { ArrowLeft } from 'lucide-react';
import { WizardProgress } from './components/WizardProgress';
import { StepUpload } from './components/StepUpload';
import { StepSelectDB } from './components/StepSelectDB';
import { StepImportMode } from './components/StepImportMode';
import { StepColumnMapping } from './components/StepColumnMapping';
import { StepPreview } from './components/StepPreview';
import { StepExecute } from './components/StepExecute';
import { WizardState, initialWizardState, WIZARD_STEPS } from './types';

export function ExcelImportPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>(initialWizardState);

  const handleUpdate = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    const stepProps = {
      state: wizardState,
      onUpdate: handleUpdate,
      onNext: handleNext,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 1:
        return <StepUpload {...stepProps} />;
      case 2:
        return <StepSelectDB {...stepProps} />;
      case 3:
        return <StepImportMode {...stepProps} />;
      case 4:
        return <StepColumnMapping {...stepProps} />;
      case 5:
        return <StepPreview {...stepProps} />;
      case 6:
        return <StepExecute {...stepProps} />;
      default:
        return <StepUpload {...stepProps} />;
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Excel Import Wizard"
        subtitle="นำเข้าข้อมูลจากไฟล์ Excel ไปยัง Database"
      />

      <div className="p-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">กลับหน้าหลัก</span>
        </button>

        {/* Progress Indicator */}
        <div className="mb-8">
          <WizardProgress steps={WIZARD_STEPS} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
