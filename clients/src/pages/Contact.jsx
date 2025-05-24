import React, { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null); // null | true | false

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(true);
        setFormData({ name: '', email: '', message: '' });
      } else {
        setSuccess(false);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSuccess(false);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[600px] bg-gray-100 pt-28 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-2">Contact Us</h1>
        <p className="text-sm text-gray-500 mb-6">
          We'd love to hear from you. Fill out the form below and we’ll get back to you soon.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            name="message"
            rows="4"
            placeholder="Your message"
            value={formData.message}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>

        {success === true && (
          <p className="mt-4 text-green-600 text-sm text-center">Message sent successfully!</p>
        )}
        {success === false && (
          <p className="mt-4 text-red-600 text-sm text-center">Failed to send message. Try again later.</p>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          Or email directly: <span className="text-blue-600">amit@example.com</span>
        </div>
      </div>
    </div>
  );
};

export default Contact;
