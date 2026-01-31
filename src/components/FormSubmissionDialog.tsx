import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface CustomForm {
  id: string;
  name: string;
  fields: FormField[];
}

interface FormSubmissionDialogProps {
  form: CustomForm;
  materialTitle: string;
  onClose: () => void;
  onSubmit: (responses: Record<string, unknown>) => void;
}

export default function FormSubmissionDialog({
  form,
  materialTitle,
  onClose,
  onSubmit,
}: FormSubmissionDialogProps) {
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (fieldId: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const current = (responses[fieldId] as string[]) || [];
    if (checked) {
      handleChange(fieldId, [...current, option]);
    } else {
      handleChange(fieldId, current.filter((o) => o !== option));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(responses);
    setLoading(false);
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "short_text":
        return (
          <Input
            value={(responses[field.id] as string) || ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case "long_text":
        return (
          <Textarea
            value={(responses[field.id] as string) || ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            rows={4}
          />
        );

      case "multiple_choice":
        return (
          <RadioGroup
            value={(responses[field.id] as string) || ""}
            onValueChange={(value) => handleChange(field.id, value)}
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkboxes":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={((responses[field.id] as string[]) || []).includes(option)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(field.id, option, checked as boolean)
                  }
                />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <Select
            value={(responses[field.id] as string) || ""}
            onValueChange={(value) => handleChange(field.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "rating":
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                type="button"
                variant={responses[field.id] === rating ? "default" : "outline"}
                size="sm"
                onClick={() => handleChange(field.id, rating)}
              >
                {rating}
              </Button>
            ))}
          </div>
        );

      case "file_upload":
        return (
          <Input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleChange(field.id, file.name);
              }
            }}
          />
        );

      default:
        return (
          <Input
            value={(responses[field.id] as string) || ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        );
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete this form to finish: {materialTitle}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {form.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit & Complete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
