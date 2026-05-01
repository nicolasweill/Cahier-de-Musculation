import { useState } from 'react';
import type { CustomFormula } from '../utils/formulaUtils';
import LabFormulaBuilder from './LabFormulaBuilder';

export default function LabTab() {
  const [customFormulas, setCustomFormulas] = useState<CustomFormula[]>(() => {
    const saved = localStorage.getItem('app-custom-formulas');
    return saved ? JSON.parse(saved) : [];
  });

  const handleSave = (formulas: CustomFormula[]) => {
    setCustomFormulas(formulas);
    localStorage.setItem('app-custom-formulas', JSON.stringify(formulas));
  };

  return (
    <LabFormulaBuilder
      asPage
      initialFormulas={customFormulas}
      onSave={handleSave}
    />
  );
}
