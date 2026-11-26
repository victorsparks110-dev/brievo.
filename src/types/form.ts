export type FormStatus = 'draft' | 'published' | 'archived'
export type FormFieldType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'checkbox'
  | 'dropdown'
  | 'yes_no'
  | 'date'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'file_upload'
  | 'image_upload'
  | 'color'
  | 'amount'
  | 'custom'

export type FormResponseStatus = 'new' | 'reviewed' | 'confirmed'

/** Work progress status — tracks the designer's delivery lifecycle. */
export type WorkStatus = 'new' | 'in_progress' | 'completed'

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
}


export const PROJECT_TYPE_OPTIONS = [
  'Logo Design',
  'Brand Identity',
  'Flyer / Poster Design',
  'Social Media Design',
  'Business Card Design',
  'Packaging Design',
  'UI/UX Design',
  'Website Design',
  'Print Design',
  'Marketing Materials',
  'Presentation Design',
  'Illustration',
  'Motion / Animation',
  'Other',
] as const

export type ProjectType = (typeof PROJECT_TYPE_OPTIONS)[number]

export const PROJECT_GOAL_OPTIONS = [
  'Launching a business',
  'Promoting a product',
  'Advertising a service',
  'Event promotion',
  'Building brand awareness',
  'Improving an existing brand',
  'Social media promotion',
  'Other',
] as const

export const PROJECT_USAGE_OPTIONS = [
  'Instagram',
  'Facebook',
  'TikTok',
  'Website',
  'Print',
  'Billboard',
  'Packaging',
  'Presentation',
  'WhatsApp',
  'Multiple platforms',
  'Other',
] as const

export type ProjectGoal = (typeof PROJECT_GOAL_OPTIONS)[number]
export type ProjectUsage = (typeof PROJECT_USAGE_OPTIONS)[number]

export interface ProjectInformation {
  clientName: string
  clientEmail: string
  clientPhone: string
  companyName: string
  projectTypes: ProjectType[]
  otherProjectType: string
  description: string
  projectGoal: ProjectGoal | ''
  otherProjectGoal: string
  targetAudience: string
  deadline: string
  noSpecificDeadline: boolean
  content: string
  preferredColors: string
  preferredColorHex: string
  noColorPreference: boolean
  projectUsage: ProjectUsage[]
  otherProjectUsage: string
  amount: number
  currency: string
  projectFiles: UploadedFormFile[]
  brandAssets: UploadedFormFile[]
  referenceFiles: UploadedFormFile[]
  referenceNotes: string
  additionalNotes: string
}

export interface FormFieldOption {
  id: string
  label: string
  value: string
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  description?: string
  required: boolean
  placeholder?: string
  options?: FormFieldOption[]
  customTypeLabel?: string
  currency?: string
  allowMultiple?: boolean
  accept?: string
  allowOther?: boolean
  otherPlaceholder?: string
  section?: 'core' | 'custom' | string
}

export function getDefaultFormFields(): FormField[] {
  return [
    // Client Information
    {
      id: 'client_name',
      type: 'short_text',
      label: 'Full Name',
      description: 'Your complete legal or preferred name',
      required: true,
      placeholder: 'Your full name',
      section: 'core',
    },
    {
      id: 'client_email',
      type: 'email',
      label: 'Email Address',
      description: 'The best email address to reach you at',
      required: true,
      placeholder: 'you@example.com',
      section: 'core',
    },
    {
      id: 'client_phone',
      type: 'phone',
      label: 'Phone Number',
      description: 'Phone number for urgent project updates',
      required: true,
      placeholder: '+234 800 000 0000',
      section: 'core',
    },
    {
      id: 'company_name',
      type: 'short_text',
      label: 'Company / Business Name',
      description: 'Name of your business, organization, or brand',
      required: false,
      placeholder: 'Company or business name',
      section: 'core',
    },

    // Project Information
    {
      id: 'project_type',
      type: 'checkbox',
      label: 'Project Type',
      description: 'What type of project do you need? Select all that apply.',
      required: true,
      section: 'core',
      allowOther: true,
      otherPlaceholder: 'Please specify project type',
      options: PROJECT_TYPE_OPTIONS.map((opt, idx) => ({
        id: `pt-opt-${idx + 1}`,
        label: opt,
        value: opt,
      })),
    },
    {
      id: 'other_project_type',
      type: 'short_text',
      label: 'Other Project Type',
      description: 'Please specify if you selected Other under Project Type',
      required: false,
      placeholder: 'Specify your project type',
      section: 'core',
    },
    {
      id: 'project_description',
      type: 'long_text',
      label: 'Full Project Description',
      description:
        'Tell us about your project. Describe what you need in as much detail as possible, including goals, ideas, style, and requirements.',
      required: true,
      placeholder: 'Describe what you need in as much detail as possible...',
      section: 'core',
    },
    {
      id: 'project_goal',
      type: 'dropdown',
      label: 'Project Goal',
      description: 'What is the main goal or objective of this project?',
      required: true,
      section: 'core',
      allowOther: true,
      otherPlaceholder: 'Please specify project goal',
      options: PROJECT_GOAL_OPTIONS.map((opt, idx) => ({
        id: `pg-opt-${idx + 1}`,
        label: opt,
        value: opt,
      })),
    },
    {
      id: 'target_audience',
      type: 'long_text',
      label: 'Target Audience',
      description:
        'Who is this project intended for? (e.g. age group, customers, industry, location)',
      placeholder: 'Describe the intended audience or ideal customer...',
      required: false,
      section: 'core',
    },
    {
      id: 'project_deadline',
      type: 'date',
      label: 'Project Deadline',
      description: 'When do you need this project completed?',
      required: false,
      section: 'core',
    },
    {
      id: 'project_content',
      type: 'long_text',
      label: 'Content / Text to Be Included',
      description:
        'What text, contact details, pricing, copy, or information should appear in the design?',
      placeholder: 'Headlines, body copy, contact info, pricing, etc...',
      required: false,
      section: 'core',
    },
    {
      id: 'preferred_colors',
      type: 'color',
      label: 'Preferred Colors',
      description: 'Specify preferred colors, hex codes, or note color palette preferences.',
      placeholder: 'e.g. Warm neutrals, #1E3A8A, earthy tones',
      required: false,
      section: 'core',
    },
    {
      id: 'project_usage',
      type: 'checkbox',
      label: 'Project Usage / Deliverables',
      description: 'Where will the final project be used?',
      required: false,
      section: 'core',
      allowOther: true,
      otherPlaceholder: 'Please specify platforms or usage',
      options: PROJECT_USAGE_OPTIONS.map((opt, idx) => ({
        id: `pu-opt-${idx + 1}`,
        label: opt,
        value: opt,
      })),
    },
    {
      id: 'agreed_amount',
      type: 'amount',
      label: 'Agreed Project Amount',
      description: 'Enter the agreed price/budget for this project.',
      currency: 'NGN (₦)',
      placeholder: '150000',
      required: true,
      section: 'core',
    },

    // Files
    {
      id: 'project_files',
      type: 'file_upload',
      label: 'Project Files',
      description:
        'Upload any general files, assets, or documents that will help complete the project.',
      allowMultiple: true,
      required: false,
      section: 'core',
    },
    {
      id: 'brand_assets',
      type: 'file_upload',
      label: 'Brand Assets',
      description:
        'Upload existing logos, brand guides, fonts, previous artwork, or design assets.',
      allowMultiple: true,
      required: false,
      section: 'core',
    },
    {
      id: 'reference_files',
      type: 'file_upload',
      label: 'References / Inspiration',
      description: 'Upload visual references, moodboards, or examples of styles you like.',
      allowMultiple: true,
      required: false,
      section: 'core',
    },

    // Additional Information
    {
      id: 'additional_notes',
      type: 'long_text',
      label: 'Additional Notes',
      description:
        'Is there anything else the designer should know before starting on this project?',
      placeholder: 'Any extra context, constraints, questions, or notes...',
      required: false,
      section: 'core',
    },
  ]
}

export interface FormDefinition {
  id: string
  designerId: string
  title: string
  description: string
  brandName: string
  status: FormStatus
  createdAt: string
  updatedAt: string
  shareToken: string
  fields: FormField[]
  publishedTitle: string
  publishedDescription: string
  publishedBrandName: string
  publishedFields: FormField[]
}

export interface UploadedFormFile {
  fieldId: string
  category: 'project' | 'brand_asset' | 'reference'
  fileName: string
  fileType: string
  url: string
  dataUrl?: string
  gridFsFileId?: string | null
  mimeType?: string
  size?: number
}

export interface FormResponse {
  id: string
  formId: string
  submittedByName: string
  submittedByEmail: string
  answers: Record<string, string | string[] | boolean | number | null>
  projectInformation: ProjectInformation
  uploadedFiles: UploadedFormFile[]
  status: FormResponseStatus
  workStatus: WorkStatus
  submittedAt: string
  reviewedAt?: string | null
  confirmationSentAt?: string | null
  confirmationSubject?: string
  confirmationBody?: string
  completedAt?: string | null
}

export interface CreateFormInput {
  designerId: string
  title: string
  description: string
  brandName: string
  status?: FormStatus
  fields: FormField[]
}

export interface SubmitFormResponseInput {
  formId: string
  submittedByName: string
  submittedByEmail: string
  answers: Record<string, string | string[] | boolean | number | null>
  projectInformation: ProjectInformation
  uploadedFiles?: UploadedFormFile[]
}
