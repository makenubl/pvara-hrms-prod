import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Calendar, Upload, FileText, 
  Camera, Save, X, Download, Trash2, Building, CreditCard,
  Home, Users as UsersIcon, Heart, Shield
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Input, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';

const EmployeeProfile = () => {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [profileData, setProfileData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    
    // Identification
    cnic: '',
    passport: '',
    
    // Address Information
    currentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    
    // Bank Details
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    iban: '',
    
    // Additional Information
    bloodGroup: '',
    nationality: 'Pakistani',
  });

  const [documents, setDocuments] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [supervisor, setSupervisor] = useState(null);

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/profile');
      const userData = response.data;
      
      // Update profile data
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
        gender: userData.gender || '',
        maritalStatus: userData.maritalStatus || '',
        cnic: userData.cnic || '',
        passport: userData.passport || '',
        currentAddress: userData.currentAddress || '',
        permanentAddress: userData.permanentAddress || '',
        city: userData.city || '',
        state: userData.state || '',
        country: userData.country || 'Pakistan',
        postalCode: userData.postalCode || '',
        emergencyContactName: userData.emergencyContactName || '',
        emergencyContactRelation: userData.emergencyContactRelation || '',
        emergencyContactPhone: userData.emergencyContactPhone || '',
        bankName: userData.bankName || '',
        accountTitle: userData.accountTitle || '',
        accountNumber: userData.accountNumber || '',
        iban: userData.iban || '',
        bloodGroup: userData.bloodGroup || '',
        nationality: userData.nationality || 'Pakistani',
      });
      
      setDocuments(userData.documents || []);
      setProfileImage(userData.profileImage);
      setSupervisor(userData.reportsTo || null);
      
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const validateProfile = () => {
    const errors = [];
    
    // Required fields
    if (!profileData.firstName?.trim()) errors.push('First name is required');
    if (!profileData.lastName?.trim()) errors.push('Last name is required');
    
    // Phone validation (if provided)
    if (profileData.phone && !/^\+?[0-9]{10,15}$/.test(profileData.phone.replace(/[\s-]/g, ''))) {
      errors.push('Phone number must be 10-15 digits');
    }
    
    // CNIC validation (if provided) - Pakistan format
    if (profileData.cnic && !/^[0-9]{5}-?[0-9]{7}-?[0-9]$/.test(profileData.cnic)) {
      errors.push('CNIC must be in format: 12345-1234567-1');
    }
    
    // Email validation (should never change but validate anyway)
    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.push('Invalid email format');
    }
    
    // Date of birth validation (not in future)
    if (profileData.dateOfBirth && new Date(profileData.dateOfBirth) > new Date()) {
      errors.push('Date of birth cannot be in the future');
    }
    
    // Postal code validation (if provided)
    if (profileData.postalCode && !/^[0-9]{5}$/.test(profileData.postalCode)) {
      errors.push('Postal code must be 5 digits');
    }
    
    // IBAN validation (if provided) - Pakistan format
    if (profileData.iban && !/^PK[0-9]{2}[A-Z]{4}[0-9]{16}$/.test(profileData.iban.replace(/\s/g, ''))) {
      errors.push('IBAN must be in Pakistan format: PK12ABCD1234567890123456');
    }
    
    return errors;
  };

  const handleSave = async () => {
    // Validate before saving
    const validationErrors = validateProfile();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      const response = await api.put('/profile', profileData);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
      // Update user in store
      if (setUser) {
        setUser(response.data.user);
      }
      
      // Reload profile to get updated data
      await loadProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await api.post('/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setProfileImage(`http://localhost:5000${response.data.photoUrl}`);
      toast.success('Profile picture updated!');
      
      // Reload profile
      await loadProfile();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, DOC, and DOCX files are allowed');
      e.target.value = ''; // Reset input
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      e.target.value = ''; // Reset input
      return;
    }

    // Ask user for document type
    const documentType = await new Promise((resolve) => {
      const type = prompt('Select document type:\n1. CNIC\n2. Passport\n3. Education\n4. Experience\n5. Medical\n6. Other\n\nEnter number (1-6):', '6');
      const types = ['CNIC', 'Passport', 'Education', 'Experience', 'Medical', 'Other'];
      const index = parseInt(type) - 1;
      resolve(types[index] || 'Other');
    });

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', documentType);
      
      const response = await api.post('/profile/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success(`${documentType} document uploaded successfully!`);
      
      // Reset file input
      e.target.value = '';
      
      // Reload profile to get updated documents
      await loadProfile();
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
      e.target.value = ''; // Reset input on error
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await api.delete(`/profile/documents/${documentId}`);
      toast.success('Document deleted');
      
      // Reload profile to get updated documents
      await loadProfile();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleDownloadDocument = async (documentId) => {
    try {
      window.open(`http://localhost:5000/api/profile/documents/${documentId}/download`, '_blank');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document');
    }
  };

  const documentTypes = ['CNIC', 'Passport', 'Education', 'Experience', 'Medical', 'Other'];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            <p className="text-slate-400 mt-4">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              My Profile
            </h1>
            <p className="text-slate-400 mt-2">Manage your personal information and documents</p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                >
                  <X size={18} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  <Save size={18} className="mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                <User size={18} className="mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Picture & Quick Info */}
          <div className="space-y-6">
            {/* Profile Picture Card */}
            <Card className="backdrop-blur-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-white/10">
              <div className="text-center">
                <div className="relative inline-block">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-cyan-500/30"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-cyan-500/30">
                      {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
                    </div>
                  )}
                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-full cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                  >
                    <Camera size={18} className="text-white" />
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <h3 className="text-xl font-bold text-white mt-4">
                  {profileData.firstName} {profileData.lastName}
                </h3>
                <p className="text-cyan-400 text-sm">{user?.position || 'Employee'}</p>
                <p className="text-slate-400 text-xs mt-1">{user?.employeeId || 'EMP-001'}</p>
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Department</span>
                  <span className="text-white">{user?.department || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Join Date</span>
                  <span className="text-white">
                    {user?.joinDate ? format(new Date(user.joinDate), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Employment Type</span>
                  <Badge variant="success">Full-time</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Status</span>
                  <Badge variant="success">{user?.status || 'Active'}</Badge>
                </div>
              </div>

              {/* Supervisor Information */}
              {supervisor && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <UsersIcon size={16} className="text-cyan-400" />
                    Reports To
                  </h4>
                  <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <img
                      src={supervisor.profileImage || `https://ui-avatars.com/api/?name=${supervisor.firstName}+${supervisor.lastName}&background=0D8ABC&color=fff`}
                      alt={`${supervisor.firstName} ${supervisor.lastName}`}
                      className="w-12 h-12 rounded-full border-2 border-cyan-500/30"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {supervisor.firstName} {supervisor.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{supervisor.email}</p>
                      <Badge variant="blue" className="mt-1 text-xs">Manager/Supervisor</Badge>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Upload Guidelines */}
            <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Shield size={20} className="text-blue-400" />
                Document Guidelines
              </h3>
              <div className="space-y-2 text-sm text-slate-300">
                <p>• Maximum file size: 10MB</p>
                <p>• Accepted formats: PDF, JPG, PNG</p>
                <p>• Clear and readable scans</p>
                <p>• Valid and up-to-date documents</p>
                <p>• CNIC front and back required</p>
              </div>
            </Card>
          </div>

          {/* Middle & Right Columns - Profile Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <User size={22} className="text-cyan-400" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={User}
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={User}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  disabled={true}
                  icon={Mail}
                  className="opacity-60"
                  title="Email cannot be changed"
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={Phone}
                  placeholder="+92 300 1234567"
                />
                <Input
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={Calendar}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
                  <select
                    name="gender"
                    value={profileData.gender}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Marital Status</label>
                  <select
                    name="maritalStatus"
                    value={profileData.maritalStatus}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={profileData.bloodGroup}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Identification */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard size={22} className="text-green-400" />
                Identification
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="CNIC Number"
                  name="cnic"
                  value={profileData.cnic}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={CreditCard}
                  placeholder="12345-1234567-1"
                />
                <Input
                  label="Passport Number"
                  name="passport"
                  value={profileData.passport}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={CreditCard}
                  placeholder="AB1234567"
                />
                <Input
                  label="Nationality"
                  name="nationality"
                  value={profileData.nationality}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={MapPin}
                />
              </div>
            </Card>

            {/* Address Information */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Home size={22} className="text-purple-400" />
                Address Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Current Address</label>
                  <textarea
                    name="currentAddress"
                    value={profileData.currentAddress}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                    placeholder="Street Address, House/Flat No."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Permanent Address</label>
                  <textarea
                    name="permanentAddress"
                    value={profileData.permanentAddress}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                    placeholder="Street Address, House/Flat No."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={profileData.city}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    icon={Building}
                  />
                  <Input
                    label="State/Province"
                    name="state"
                    value={profileData.state}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    icon={MapPin}
                  />
                  <Input
                    label="Country"
                    name="country"
                    value={profileData.country}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    icon={MapPin}
                  />
                  <Input
                    label="Postal Code"
                    name="postalCode"
                    value={profileData.postalCode}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    icon={MapPin}
                  />
                </div>
              </div>
            </Card>

            {/* Emergency Contact */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Heart size={22} className="text-red-400" />
                Emergency Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contact Name"
                  name="emergencyContactName"
                  value={profileData.emergencyContactName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={UsersIcon}
                />
                <Input
                  label="Relationship"
                  name="emergencyContactRelation"
                  value={profileData.emergencyContactRelation}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={UsersIcon}
                  placeholder="Father, Mother, Spouse, etc."
                />
                <Input
                  label="Contact Phone"
                  name="emergencyContactPhone"
                  value={profileData.emergencyContactPhone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={Phone}
                  placeholder="+92 300 1234567"
                />
              </div>
            </Card>

            {/* Bank Details */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Building size={22} className="text-yellow-400" />
                Bank Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  name="bankName"
                  value={profileData.bankName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={Building}
                />
                <Input
                  label="Account Title"
                  name="accountTitle"
                  value={profileData.accountTitle}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={User}
                />
                <Input
                  label="Account Number"
                  name="accountNumber"
                  value={profileData.accountNumber}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={CreditCard}
                />
                <Input
                  label="IBAN"
                  name="iban"
                  value={profileData.iban}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  icon={CreditCard}
                  placeholder="PK36SCBL0000001123456702"
                />
              </div>
            </Card>

            {/* Documents Section */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText size={22} className="text-cyan-400" />
                  Documents
                </h2>
                <label
                  htmlFor="document-upload"
                  className="cursor-pointer"
                >
                  <Button
                    as="span"
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                    disabled={uploadingDocument}
                  >
                    <Upload size={18} className="mr-2" />
                    {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                  </Button>
                  <input
                    id="document-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={uploadingDocument}
                  />
                </label>
              </div>

              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc._id || doc.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-cyan-500/20">
                          <FileText size={20} className="text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span>{doc.type}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.uploadDate ? format(new Date(doc.uploadDate), 'MMM dd, yyyy') : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={doc.status === 'verified' ? 'success' : 'warning'}
                        >
                          {doc.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadDocument(doc._id || doc.id)}
                        >
                          <Download size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc._id || doc.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeProfile;
