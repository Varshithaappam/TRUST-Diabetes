import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, Phone, User, Mail, Activity, Plus } from 'lucide-react';

/**
 * Add Hospital Form Component (Inline version)
 * Fields: hospital name, hospital code, hospital address, contact_person_name, phone_number, contact_person_email
 */
const AddHospitalForm = ({ onSuccess, onCancel }) => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        hospital_name: '',
        hospital_code: '',
        hospital_address: '',
        phone_number: '',
        contact_person_name: '',
        contact_person_email: '',
        is_active: true
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                is_active: formData.is_active === true || formData.is_active === 'true'
            };

            const response = await axios.post(
                'http://localhost:5000/api/users/add-hospital',
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.status === 201) {
                onSuccess?.(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to add hospital');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Hospital Details */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-indigo-600" /> Hospital Details
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                Hospital Name *
                            </label>
                            <input
                                type="text"
                                name="hospital_name"
                                value={formData.hospital_name}
                                onChange={handleChange}
                                required
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                placeholder="Enter hospital name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                Hospital Code
                            </label>
                            <input
                                type="text"
                                name="hospital_code"
                                value={formData.hospital_code}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                placeholder="Enter hospital code"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                Hospital Address
                            </label>
                            <textarea
                                name="hospital_address"
                                value={formData.hospital_address}
                                onChange={handleChange}
                                rows={2}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                                placeholder="Enter hospital address"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column - Contact Information */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <User className="w-6 h-6 text-indigo-600" /> Contact Information
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                Contact Phone Number
                            </label>
                            <input
                                type="tel"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                Contact Person Name
                            </label>
                            <input
                                type="text"
                                name="contact_person_name"
                                value={formData.contact_person_name}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                placeholder="Enter contact person name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                Contact Person Email
                            </label>
                            <input
                                type="email"
                                name="contact_person_email"
                                value={formData.contact_person_email}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                placeholder="Enter contact person email"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                Status
                            </label>
                            <select
                                name="is_active"
                                value={formData.is_active}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                            >
                                <option value={true}>Active</option>
                                <option value={false}>Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-8">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        'Saving...'
                    ) : (
                        <>
                            <Plus className="w-5 h-5" />
                            Save Hospital
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default AddHospitalForm;