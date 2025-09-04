import { ImportWizard } from '@/components/ImportWizard';

const Import = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import Transactions</h1>
        <p className="text-muted-foreground mt-2">
          Upload CSV, Excel, or PDF files to automatically import your transactions
        </p>
      </div>
      <ImportWizard />
    </div>
  );
};

export default Import;