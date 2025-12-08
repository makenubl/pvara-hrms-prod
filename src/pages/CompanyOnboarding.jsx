import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Upload, Palette, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCompanyStore } from '../store/companyStore';
import { useAuthStore } from '../store/authStore';
import { Card, Button, Input } from '../components/UI';

const CompanyOnboarding = () => {
  const navigate = useNavigate();
  const { updateBranding, uploadLogo, setCurrentCompany, applyTheme } = useCompanyStore();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    size: '',
    website: '',
    address: '',
    phone: '',
    tagline: '',
  });
  
  const [branding, setBranding] = useState({
    logo: null,
    logoPreview: null,
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
    accentColor: '#60a5fa',
  });

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Retail',
    'Manufacturing', 'Construction', 'Hospitality', 'Real Estate', 'Other'
  ];

  const companySizes = [
    '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  ];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setBranding({
          ...branding,
          logo: file,
          logoPreview: reader.result
        });
        toast.success('Logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (colorType, value) => {
    setBranding({ ...branding, [colorType]: value });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.companyName || !formData.industry || !formData.size) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleComplete = () => {
    // Save company data
    const company = {
      id: Date.now().toString(),
      ...formData,
      ownerId: user?.id,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    
    setCurrentCompany(company);
    
    // Save branding
    updateBranding({
      companyName: formData.companyName,
      tagline: formData.tagline,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
    });
    
    if (branding.logoPreview) {
      uploadLogo(branding.logoPreview);
    }
    
    // Apply theme
    applyTheme();
    
    toast.success('Company profile created successfully!');
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Company Information</h2>
            <p className="text-gray-600">Let's start with basic information about your company</p>
            
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Enter your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry <span className="text-red-500">*</span>
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select industry</option>
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size <span className="text-red-500">*</span>
                </label>
                <select
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select size</option>
                  {companySizes.map(size => (
                    <option key={size} value={size}>{size} employees</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <Input
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter company address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tagline
                </label>
                <Input
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  placeholder="Your company's tagline or motto"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Company Branding</h2>
            <p className="text-gray-600">Upload your logo and customize your brand colors</p>
            
            <div className="space-y-6 mt-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    {branding.logoPreview ? (
                      <img src={branding.logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      as="label"
                      htmlFor="logo-upload"
                      variant="secondary"
                      className="cursor-pointer"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      PNG, JPG or SVG (max 5MB). Recommended: 400x400px
                    </p>
                  </div>
                </div>
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Brand Colors
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
                      />
                      <Input
                        value={branding.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
                      />
                      <Input
                        value={branding.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        placeholder="#1d4ed8"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.accentColor}
                        onChange={(e) => handleColorChange('accentColor', e.target.value)}
                        className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
                      />
                      <Input
                        value={branding.accentColor}
                        onChange={(e) => handleColorChange('accentColor', e.target.value)}
                        placeholder="#60a5fa"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Preview</h3>
                <div className="space-y-4">
                  <div 
                    className="h-16 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    Primary Color
                  </div>
                  <div 
                    className="h-16 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: branding.secondaryColor }}
                  >
                    Secondary Color
                  </div>
                  <div 
                    className="h-16 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: branding.accentColor }}
                  >
                    Accent Color
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
              <p className="text-gray-600">Review your company profile before completing setup</p>
            </div>
            
            <Card className="mt-8">
              <div className="space-y-4">
                {/* Logo and Company Name */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  {branding.logoPreview && (
                    <img src={branding.logoPreview} alt="Company logo" className="w-16 h-16 object-contain" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{formData.companyName}</h3>
                    {formData.tagline && (
                      <p className="text-sm text-gray-600">{formData.tagline}</p>
                    )}
                  </div>
                </div>

                {/* Company Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Industry</p>
                    <p className="font-medium">{formData.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Company Size</p>
                    <p className="font-medium">{formData.size} employees</p>
                  </div>
                  {formData.website && (
                    <div>
                      <p className="text-sm text-gray-600">Website</p>
                      <p className="font-medium text-blue-600">{formData.website}</p>
                    </div>
                  )}
                  {formData.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{formData.phone}</p>
                    </div>
                  )}
                </div>

                {formData.address && (
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{formData.address}</p>
                  </div>
                )}

                {/* Brand Colors */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">Brand Colors</p>
                  <div className="flex gap-2">
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-gray-200"
                      style={{ backgroundColor: branding.primaryColor }}
                      title="Primary"
                    />
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-gray-200"
                      style={{ backgroundColor: branding.secondaryColor }}
                      title="Secondary"
                    />
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-gray-200"
                      style={{ backgroundColor: branding.accentColor }}
                      title="Accent"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((num) => (
              <React.Fragment key={num}>
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                      step >= num 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step > num ? <CheckCircle size={24} /> : num}
                  </div>
                  <p className="text-sm mt-2 text-gray-600">
                    {num === 1 ? 'Company Info' : num === 2 ? 'Branding' : 'Review'}
                  </p>
                </div>
                {num < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${step > num ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <Card className="p-8">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>

            {step < 3 ? (
              <Button onClick={handleNext} className="flex items-center gap-2">
                Next
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="flex items-center gap-2">
                Complete Setup
                <CheckCircle size={16} />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CompanyOnboarding;
