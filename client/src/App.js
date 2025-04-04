import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('manage'); 
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [isCreatingNewRecord, setIsCreatingNewRecord] = useState(false);
  const [newRecordData, setNewRecordData] = useState({});
  const [isCopyingRecord, setIsCopyingRecord] = useState(false);

  // Knowledge Base states
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', description: '', tags: '' });
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(null);
  const [editedNote, setEditedNote] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [contentPrompt, setContentPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeContentTab, setActiveContentTab] = useState('manual');
  const [activeNoteTab, setActiveNoteTab] = useState('manual');

  // API base URL
  const API_URL = 'http://localhost:5000/api';

  // Fetch databases on component mount
  useEffect(() => {
    fetchDatabases();
  }, []);

  // Fetch topics when Knowledge Base tab is selected
  useEffect(() => {
    if (activeTab === 'kb') {
      fetchTopics();
    }
  }, [activeTab]);

  // Add a separate effect to prevent topics from disappearing
  useEffect(() => {
    // Keep the topics loaded when they're already fetched
    if (topics.length > 0 && searchResults.length === 0 && !isSearching && activeTab === 'kb') {
      setSearchResults(topics);
    }
  }, [topics, searchResults, isSearching, activeTab]);

  // Fetch tables when a database is selected in the manage tab
  useEffect(() => {
    if (selectedDb && activeTab === 'manage') {
      fetchTables(selectedDb);
    }
  }, [selectedDb, activeTab]);

  // Fetch table data when a table is selected
  useEffect(() => {
    if (selectedDb && selectedTable && activeTab === 'manage') {
      fetchTableData(selectedDb, selectedTable);
    } else {
      setTableData(null);
      setSelectedRows([]);
      setEditRow(null);
    }
  }, [selectedDb, selectedTable, activeTab]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an Excel file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResult(response.data);
      // Refresh the database list
      fetchDatabases();
      // Select the newly created database
      setSelectedDb(response.data.database);
      // Switch to manage tab to view the data
      setActiveTab('manage');
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Fetch list of databases
  const fetchDatabases = async () => {
    try {
      const response = await axios.get(`${API_URL}/databases`);
      setDatabases(response.data);
    } catch (error) {
      console.error('Error fetching databases:', error);
    }
  };

  // Fetch tables for a database
  const fetchTables = async (dbName) => {
    try {
      setLoadingData(true);
      const response = await axios.get(`${API_URL}/database/${dbName}/tables`);
      setTables(response.data);
      setSelectedTable('');
    } catch (error) {
      console.error(`Error fetching tables for ${dbName}:`, error);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch table data
  const fetchTableData = async (dbName, tableName) => {
    try {
      setLoadingData(true);
      const response = await axios.get(`${API_URL}/database/${dbName}/table/${tableName}/data`);
      setTableData(response.data);
      setSelectedRows([]);
      setEditRow(null);
    } catch (error) {
      console.error(`Error fetching data for ${tableName}:`, error);
    } finally {
      setLoadingData(false);
    }
  };

  // Handle row selection
  const handleRowSelect = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle select all rows
  const handleSelectAll = () => {
    if (tableData && tableData.data.length > 0) {
      if (selectedRows.length === tableData.data.length) {
        // Deselect all
        setSelectedRows([]);
      } else {
        // Select all
        setSelectedRows(tableData.data.map(row => row.id));
      }
    }
  };

  // Handle edit row
  const handleEditRow = (row) => {
    setEditRow(row.id);
    setEditData(row);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditRow(null);
    setEditData({});
  };

  // Handle input change for editing
  const handleEditChange = (e, columnName) => {
    setEditData(prev => ({
      ...prev,
      [columnName]: e.target.value
    }));
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      const response = await axios.put(
        `${API_URL}/database/${selectedDb}/table/${selectedTable}/record/${editRow}`,
        editData
      );
      
      // Update the table data with the edited row
      setTableData(prev => ({
        ...prev,
        data: prev.data.map(row => 
          row.id === editRow ? response.data.record : row
        )
      }));
      
      setEditRow(null);
      setEditData({});
    } catch (error) {
      console.error('Error updating record:', error);
      alert(`Failed to update record: ${error.response?.data?.error || error.message}`);
    }
  };

  // Handle input change for new record
  const handleNewRecordChange = (e, columnName) => {
    setNewRecordData(prev => ({
      ...prev,
      [columnName]: e.target.value
    }));
  };

  // Handle create new record
  const handleCreateNewRecord = () => {
    setIsCreatingNewRecord(true);
    setNewRecordData({});
  };

  // Handle cancel new record
  const handleCancelNewRecord = () => {
    setIsCreatingNewRecord(false);
    setIsCopyingRecord(false);
    setNewRecordData({});
  };

  // Handle save new record
  const handleSaveNewRecord = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/database/${selectedDb}/table/${selectedTable}/record`,
        newRecordData
      );
      
      // Add the new record to the table data
      setTableData(prev => ({
        ...prev,
        data: [...prev.data, response.data.record]
      }));
      
      setIsCreatingNewRecord(false);
      setIsCopyingRecord(false);
      setNewRecordData({});
    } catch (error) {
      console.error('Error creating record:', error);
      alert(`Failed to create record: ${error.response?.data?.error || error.message}`);
    }
  };

  // Handle copy record
  const handleCopyRecord = (row) => {
    // Create a copy of the row data, excluding the id field
    const rowCopy = { ...row };
    delete rowCopy.id; // Remove the id so a new one will be generated
    
    setNewRecordData(rowCopy);
    setIsCreatingNewRecord(true);
    setIsCopyingRecord(true);
  };

  // Handle delete selected rows
  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      alert('Please select at least one row to delete');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} record(s)?`)) {
      return;
    }
    
    try {
      await axios.delete(
        `${API_URL}/database/${selectedDb}/table/${selectedTable}/records`,
        { data: { ids: selectedRows } }
      );
      
      // Remove deleted rows from the table data
      setTableData(prev => ({
        ...prev,
        data: prev.data.filter(row => !selectedRows.includes(row.id))
      }));
      
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting records:', error);
      alert(`Failed to delete records: ${error.response?.data?.error || error.message}`);
    }
  };

  // Knowledge Base functions
  // Fetch all topics
  const fetchTopics = async () => {
    try {
      setIsSearching(true);
      const response = await axios.get(`${API_URL}/kb/topics`);
      console.log('Fetched topics:', response.data);
      setTopics(response.data);
      setSearchResults(response.data);
      setIsSearching(false);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setIsSearching(false);
    }
  };

  // Search topics and notes
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(topics);
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.get(`${API_URL}/kb/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
      setIsSearching(false);
    } catch (error) {
      console.error('Error searching topics and notes:', error);
      setIsSearching(false);
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'kb') {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  // Get topic details
  const fetchTopicDetails = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/kb/topics/${id}`);
      setSelectedTopic(response.data);
    } catch (error) {
      console.error(`Error fetching topic details for ID ${id}:`, error);
    }
  };

  // Create a new topic
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    
    if (!newTopic.title.trim()) {
      alert('Topic title is required');
      return;
    }

    try {
      // Convert tags string to array
      const tagsArray = newTopic.tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      const response = await axios.post(`${API_URL}/kb/topics`, {
        title: newTopic.title,
        description: newTopic.description,
        tags: tagsArray
      });
      
      // Add the new topic to the list
      setTopics(prev => [response.data.topic, ...prev]);
      setSearchResults(prev => [response.data.topic, ...prev]);
      
      // Reset form and close it
      setNewTopic({ title: '', description: '', tags: '' });
      setIsAddingTopic(false);
      
      // Select the newly created topic
      fetchTopicDetails(response.data.topic.id);
    } catch (error) {
      console.error('Error creating topic:', error);
      alert(`Failed to create topic: ${error.response?.data?.error || error.message}`);
    }
  };

  // Update a topic
  const handleUpdateTopic = async (e) => {
    e.preventDefault();
    
    if (!selectedTopic || !selectedTopic.title.trim()) {
      alert('Topic title is required');
      return;
    }

    try {
      // Convert tags string to array if it's a string
      let tagsArray = selectedTopic.tags;
      if (typeof selectedTopic.tags === 'string') {
        tagsArray = selectedTopic.tags.split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
      
      const response = await axios.put(`${API_URL}/kb/topics/${selectedTopic.id}`, {
        title: selectedTopic.title,
        description: selectedTopic.description,
        tags: tagsArray
      });
      
      // Update the topic in the lists
      const updatedTopic = response.data.topic;
      setTopics(prev => prev.map(topic => 
        topic.id === updatedTopic.id ? updatedTopic : topic
      ));
      setSearchResults(prev => prev.map(topic => 
        topic.id === updatedTopic.id ? updatedTopic : topic
      ));
      
      // Update the selected topic
      setSelectedTopic(updatedTopic);
      setIsEditingTopic(false);
    } catch (error) {
      console.error(`Error updating topic ${selectedTopic.id}:`, error);
      alert(`Failed to update topic: ${error.response?.data?.error || error.message}`);
    }
  };

  // Delete a topic
  const handleDeleteTopic = async (id) => {
    if (!window.confirm('Are you sure you want to delete this topic? This will also delete all notes associated with it.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/kb/topics/${id}`);
      
      // Remove the topic from the lists
      setTopics(prev => prev.filter(topic => topic.id !== id));
      setSearchResults(prev => prev.filter(topic => topic.id !== id));
      
      // Clear selected topic if it was the one deleted
      if (selectedTopic && selectedTopic.id === id) {
        setSelectedTopic(null);
      }
    } catch (error) {
      console.error(`Error deleting topic ${id}:`, error);
      alert(`Failed to delete topic: ${error.response?.data?.error || error.message}`);
    }
  };

  // Add a note to a topic
  const handleAddNote = async (e) => {
    e.preventDefault();
    
    if (!selectedTopic) {
      alert('No topic selected');
      return;
    }
    
    if (!newNote.trim()) {
      alert('Note content is required');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/kb/topics/${selectedTopic.id}/notes`, {
        content: newNote
      });
      
      // Add the new note to the selected topic
      setSelectedTopic(prev => ({
        ...prev,
        notes: [response.data.note, ...(prev.notes || [])]
      }));
      
      // Reset form and close it
      setNewNote('');
      setIsAddingNote(false);
      
      // Select the newly created topic
      fetchTopicDetails(response.data.note.id);
    } catch (error) {
      console.error(`Error adding note to topic ${selectedTopic.id}:`, error);
      alert(`Failed to add note: ${error.response?.data?.error || error.message}`);
    }
  };

  // Update a note
  const handleUpdateNote = async (e) => {
    e.preventDefault();
    
    if (!selectedTopic || !isEditingNote) {
      return;
    }
    
    if (!editedNote.trim()) {
      alert('Note content is required');
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/kb/notes/${isEditingNote}`, {
        content: editedNote
      });
      
      // Update the note in the selected topic
      setSelectedTopic(prev => ({
        ...prev,
        notes: prev.notes.map(note => 
          note.id === isEditingNote ? response.data.note : note
        )
      }));
      
      // Reset form and close it
      setEditedNote('');
      setIsEditingNote(null);
    } catch (error) {
      console.error(`Error updating note ${isEditingNote}:`, error);
      alert(`Failed to update note: ${error.response?.data?.error || error.message}`);
    }
  };

  // Delete a note
  const handleDeleteNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/kb/notes/${id}`);
      
      // Remove the note from the selected topic
      setSelectedTopic(prev => ({
        ...prev,
        notes: prev.notes.filter(note => note.id !== id)
      }));
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error);
      alert(`Failed to delete note: ${error.response?.data?.error || error.message}`);
    }
  };

  // Handle cancel adding topic
  const handleCancelAddTopic = () => {
    setNewTopic({ title: '', description: '', tags: '' });
    setIsAddingTopic(false);
    setGeneratedContent('');
    setContentPrompt('');
  };

  // Generate content with GooseAI
  const handleGenerateContent = async (e) => {
    e.preventDefault();
    
    if (!contentPrompt.trim()) {
      alert('Please enter a prompt for content generation');
      return;
    }
    
    try {
      setIsGeneratingContent(true);
      
      const response = await axios.post(`${API_URL}/kb/generate-content`, {
        prompt: contentPrompt,
        title: newTopic.title
      });
      
      setGeneratedContent(response.data.content);
      
      // If we're adding a new topic, update the description with the generated content
      if (isAddingTopic) {
        setNewTopic(prev => ({ ...prev, description: response.data.content }));
      }
      // If we're adding a new note, update the new note with the generated content
      else if (isAddingNote) {
        setNewNote(response.data.content);
      }
      
    } catch (error) {
      console.error('Error generating content:', error);
      
      // Check if it's a quota exceeded error or other API error
      const errorMessage = error.response?.data?.details || error.message;
      if (errorMessage.includes('quota') || 
          errorMessage.includes('rate limit') || 
          error.response?.status === 429 ||
          errorMessage.includes('authentication')) {
        alert('AI API error: ' + errorMessage + '\nPlease use manual entry instead or try again later.');
        
        // Switch to manual entry tab
        if (isAddingTopic) {
          setActiveContentTab('manual');
        } else if (isAddingNote) {
          setActiveNoteTab('manual');
        }
      } else {
        alert(`Failed to generate content: ${errorMessage}`);
      }
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Handle cancel editing topic
  const handleCancelEditTopic = () => {
    setIsEditingTopic(false);
  };

  // Handle cancel adding note
  const handleCancelAddNote = () => {
    setNewNote('');
    setIsAddingNote(false);
  };

  // Handle cancel editing note
  const handleCancelEditNote = () => {
    setEditedNote('');
    setIsEditingNote(null);
  };

  // Handle edit note click
  const handleEditNoteClick = (note) => {
    setEditedNote(note.content);
    setIsEditingNote(note.id);
  };

  // Render tabs
  const renderTabs = () => (
    <ul className="nav nav-tabs mb-4">
      <li className="nav-item">
        <button 
          className={`nav-link ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          <i className="bi bi-table me-2"></i>Manage Data
        </button>
      </li>
      <li className="nav-item">
        <button 
          className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <i className="bi bi-upload me-2"></i>Upload Excel
        </button>
      </li>
      <li className="nav-item">
        <button 
          className={`nav-link ${activeTab === 'kb' ? 'active' : ''}`}
          onClick={() => setActiveTab('kb')}
        >
          <i className="bi bi-journal-text me-2"></i>Knowledge Base
        </button>
      </li>
    </ul>
  );

  // Render upload tab
  const renderUploadTab = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="card mb-4 shadow">
          <div className="card-header bg-primary text-white">
            <h5 className="card-title mb-0">
              <i className="bi bi-file-earmark-excel me-2"></i>
              Upload Excel File
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleUpload}>
              <div className="mb-3">
                <label htmlFor="excelFile" className="form-label">Select Excel File</label>
                <input 
                  type="file" 
                  className="form-control" 
                  id="excelFile" 
                  accept=".xlsx,.xls" 
                  onChange={handleFileChange}
                />
                <div className="form-text">Each sheet will become a table in PostgreSQL</div>
              </div>
              
              {error && <div className="alert alert-danger">{error}</div>}
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={uploading || !file}
              >
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-upload me-2"></i>
                    Upload and Process
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {result && (
          <div className="card mb-4 shadow">
            <div className="card-header bg-success text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-check-circle me-2"></i>
                Processing Result
              </h5>
            </div>
            <div className="card-body">
              <p><strong>Database created:</strong> {result.database}</p>
              <p><strong>Tables created:</strong> {result.tables.length}</p>
              <ul className="list-group">
                {result.tables.map((table, index) => (
                  <li key={index} className="list-group-item">
                    <i className="bi bi-table me-2 text-primary"></i>
                    <strong>{table.name}</strong> - {table.rowCount} rows, {table.columns} columns
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      
      <div className="col-md-6">
        <div className="card mb-4 shadow">
          <div className="card-header bg-info text-white">
            <h5 className="card-title mb-0">
              <i className="bi bi-database me-2"></i>
              Created Databases
            </h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="databaseSelect" className="form-label">Available Databases</label>
              <select 
                className="form-select" 
                id="databaseSelect"
                value={selectedDb}
                onChange={(e) => setSelectedDb(e.target.value)}
              >
                <option value="">-- Select Database --</option>
                {databases.map((db, index) => (
                  <option key={index} value={db}>{db}</option>
                ))}
              </select>
            </div>
            
            {selectedDb && (
              <div className="alert alert-info">
                <p className="mb-0">
                  <i className="bi bi-database me-2"></i>
                  <strong>Database:</strong> {selectedDb}
                </p>
                <p className="mb-0 mt-2">
                  <small>Tables were automatically created from Excel sheets.</small>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render manage data tab
  const renderManageTab = () => (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="card shadow">
          <div className="card-header bg-dark text-white">
            <h5 className="card-title mb-0">
              <i className="bi bi-table me-2"></i>
              Manage Database Data
            </h5>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-6">
                <label htmlFor="manageDatabaseSelect" className="form-label">
                  <i className="bi bi-database me-2"></i>
                  Select Database
                </label>
                <select 
                  className="form-select" 
                  id="manageDatabaseSelect"
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  disabled={loadingData}
                >
                  <option value="">-- Select Database --</option>
                  {databases.map((db, index) => (
                    <option key={index} value={db}>{db}</option>
                  ))}
                </select>
              </div>
              
              {selectedDb && (
                <div className="col-md-6">
                  <label htmlFor="manageTableSelect" className="form-label">
                    <i className="bi bi-table me-2"></i>
                    Select Table
                  </label>
                  <select 
                    className="form-select" 
                    id="manageTableSelect"
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    disabled={loadingData || tables.length === 0}
                  >
                    <option value="">-- Select Table --</option>
                    {tables.map((table, index) => (
                      <option key={index} value={table}>{table}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {loadingData && (
              <div className="d-flex justify-content-center my-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            
            {tableData && !loadingData && (
              <>
                <div className="mb-3">
                  <button 
                    className="btn btn-success me-2" 
                    onClick={handleCreateNewRecord}
                    disabled={isCreatingNewRecord}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Record
                  </button>
                  <button 
                    className="btn btn-danger me-2" 
                    onClick={handleDeleteSelected}
                    disabled={selectedRows.length === 0}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Delete Selected ({selectedRows.length})
                  </button>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-bordered table-striped table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectedRows.length === tableData.data.length && tableData.data.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        {tableData.structure.map((col, index) => (
                          <th key={index}>{col.column_name}</th>
                        ))}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isCreatingNewRecord && (
                        <tr className="table-info">
                          <td>
                            <i className="bi bi-plus-circle-fill text-success"></i>
                          </td>
                          {tableData.structure.map((col, colIndex) => (
                            <td key={colIndex}>
                              <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                value={newRecordData[col.column_name] || ''}
                                onChange={(e) => handleNewRecordChange(e, col.column_name)}
                                placeholder={`Enter ${col.column_name}`}
                              />
                            </td>
                          ))}
                          <td>
                            <button 
                              className="btn btn-sm btn-success me-1" 
                              onClick={handleSaveNewRecord}
                            >
                              <i className="bi bi-check-circle me-1"></i>
                              Save {isCopyingRecord ? 'Copy' : 'New'}
                            </button>
                            <button 
                              className="btn btn-sm btn-secondary" 
                              onClick={handleCancelNewRecord}
                            >
                              <i className="bi bi-x-circle me-1"></i>
                              Cancel
                            </button>
                          </td>
                        </tr>
                      )}
                      {tableData.data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>
                            <input 
                              type="checkbox" 
                              className="form-check-input" 
                              checked={selectedRows.includes(row.id)}
                              onChange={() => handleRowSelect(row.id)}
                            />
                          </td>
                          {tableData.structure.map((col, colIndex) => (
                            <td key={colIndex}>
                              {editRow === row.id ? (
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  value={editData[col.column_name] || ''}
                                  onChange={(e) => handleEditChange(e, col.column_name)}
                                />
                              ) : (
                                row[col.column_name] !== null ? row[col.column_name].toString() : 'NULL'
                              )}
                            </td>
                          ))}
                          <td>
                            {editRow === row.id ? (
                              <>
                                <button 
                                  className="btn btn-sm btn-success me-1" 
                                  onClick={handleSaveEdit}
                                >
                                  <i className="bi bi-check-circle me-1"></i>
                                  Save
                                </button>
                                <button 
                                  className="btn btn-sm btn-secondary" 
                                  onClick={handleCancelEdit}
                                >
                                  <i className="bi bi-x-circle me-1"></i>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-sm btn-primary me-1" 
                                  onClick={() => handleEditRow(row)}
                                  disabled={editRow !== null || isCreatingNewRecord}
                                >
                                  <i className="bi bi-pencil me-1"></i>
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-sm btn-info" 
                                  onClick={() => handleCopyRecord(row)}
                                  disabled={editRow !== null || isCreatingNewRecord}
                                >
                                  <i className="bi bi-files me-1"></i>
                                  Copy
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {selectedDb && selectedTable && !tableData && !loadingData && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                No data available for this table.
              </div>
            )}
            
            {selectedDb && tables.length === 0 && !loadingData && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                No tables found in this database.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Knowledge Base tab
  const renderKnowledgeBaseTab = () => (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="card shadow">
          <div className="card-header bg-dark text-white">
            <h5 className="card-title mb-0">
              <i className="bi bi-journal-text me-2"></i>
              Knowledge Base
            </h5>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-6">
                <label htmlFor="kbSearch" className="form-label">
                  <i className="bi bi-search me-2"></i>
                  Search Knowledge Base
                </label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    id="kbSearch"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for topics, notes, or tags"
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSearch}
                  >
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <button 
                  className="btn btn-success" 
                  onClick={() => setIsAddingTopic(true)}
                  disabled={isAddingTopic}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Add New Topic
                </button>
              </div>
            </div>
            
            {isSearching && (
              <div className="d-flex justify-content-center my-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Searching...</span>
                </div>
              </div>
            )}
            
            <div className="row">
              <div className={`col-md-${selectedTopic ? '4' : '12'}`}>
                {searchResults.length > 0 ? (
                  <div className="list-group mb-4">
                    {searchResults.map((topic) => (
                      <div 
                        key={topic.id} 
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedTopic && selectedTopic.id === topic.id ? 'active' : ''}`}
                        onClick={() => fetchTopicDetails(topic.id)}
                      >
                        <div>
                          <h6 className="mb-1">{topic.title}</h6>
                          <small>{topic.description?.substring(0, 50)}{topic.description?.length > 50 ? '...' : ''}</small>
                          {topic.tags && (
                            <div className="mt-1">
                              {topic.tags.split(',').map((tag, idx) => (
                                <span key={idx} className="badge bg-info me-1">{tag.trim()}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="badge bg-primary rounded-pill">{topic.note_count} notes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isSearching && (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    No topics found. Create a new topic to get started.
                  </div>
                )}
              </div>
              
              {selectedTopic && (
                <div className="col-md-8">
                  <div className="card shadow">
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                      <h5 className="card-title mb-0">
                        {isEditingTopic ? 'Edit Topic' : selectedTopic.title}
                      </h5>
                      <div>
                        {!isEditingTopic && (
                          <>
                            <button 
                              className="btn btn-sm btn-light me-2" 
                              onClick={() => setIsEditingTopic(true)}
                            >
                              <i className="bi bi-pencil me-1"></i>
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-danger" 
                              onClick={() => handleDeleteTopic(selectedTopic.id)}
                            >
                              <i className="bi bi-trash me-1"></i>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      {isEditingTopic ? (
                        <form onSubmit={handleUpdateTopic}>
                          <div className="mb-3">
                            <label htmlFor="editTopicTitle" className="form-label">Topic Title</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="editTopicTitle"
                              value={selectedTopic.title}
                              onChange={(e) => setSelectedTopic(prev => ({ ...prev, title: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label htmlFor="editTopicDescription" className="form-label">Description</label>
                            <textarea 
                              className="form-control" 
                              id="editTopicDescription"
                              value={selectedTopic.description || ''}
                              onChange={(e) => setSelectedTopic(prev => ({ ...prev, description: e.target.value }))}
                              rows="3"
                            />
                          </div>
                          <div className="mb-3">
                            <label htmlFor="editTopicTags" className="form-label">Tags (comma separated)</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="editTopicTags"
                              value={selectedTopic.tags || ''}
                              onChange={(e) => setSelectedTopic(prev => ({ ...prev, tags: e.target.value }))}
                            />
                          </div>
                          <button type="submit" className="btn btn-primary me-2">
                            <i className="bi bi-check-circle me-1"></i>
                            Save Changes
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={handleCancelEditTopic}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <p className="card-text">{selectedTopic.description}</p>
                          {selectedTopic.tags && (
                            <div className="mb-3">
                              <strong>Tags:</strong> 
                              <div className="mt-1">
                                {selectedTopic.tags.split(',').map((tag, idx) => (
                                  <span key={idx} className="badge bg-info me-1">{tag.trim()}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">Notes</h6>
                            <button 
                              className="btn btn-sm btn-success" 
                              onClick={() => setIsAddingNote(true)}
                              disabled={isAddingNote}
                            >
                              <i className="bi bi-plus-circle me-1"></i>
                              Add Note
                            </button>
                          </div>
                          
                          {selectedTopic.notes && selectedTopic.notes.length > 0 ? (
                            <div className="list-group">
                              {selectedTopic.notes.map((note) => (
                                <div key={note.id} className="list-group-item">
                                  {isEditingNote === note.id ? (
                                    <form onSubmit={handleUpdateNote}>
                                      <div className="mb-3">
                                        <textarea 
                                          className="form-control" 
                                          value={editedNote}
                                          onChange={(e) => setEditedNote(e.target.value)}
                                          rows="3"
                                          required
                                        />
                                      </div>
                                      <button type="submit" className="btn btn-sm btn-primary me-2">
                                        <i className="bi bi-check-circle me-1"></i>
                                        Save
                                      </button>
                                      <button 
                                        type="button" 
                                        className="btn btn-sm btn-secondary" 
                                        onClick={handleCancelEditNote}
                                      >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Cancel
                                      </button>
                                    </form>
                                  ) : (
                                    <div className="d-flex justify-content-between">
                                      <div className="note-content" style={{ whiteSpace: 'pre-wrap' }}>
                                        {note.content}
                                        <div className="text-muted mt-2">
                                          <small>
                                            Created: {new Date(note.created_at).toLocaleString()}
                                            {note.updated_at !== note.created_at && 
                                              ` (Updated: ${new Date(note.updated_at).toLocaleString()})`
                                            }
                                          </small>
                                        </div>
                                      </div>
                                      <div>
                                        <button 
                                          className="btn btn-sm btn-outline-primary me-1" 
                                          onClick={() => handleEditNoteClick(note)}
                                        >
                                          <i className="bi bi-pencil"></i>
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-outline-danger" 
                                          onClick={() => handleDeleteNote(note.id)}
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="alert alert-light">
                              No notes yet. Add a note to get started.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {isAddingTopic && (
              <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                      <h5 className="modal-title">
                        <i className="bi bi-plus-circle me-2"></i>
                        Add New Topic
                      </h5>
                      <button type="button" className="btn-close" onClick={handleCancelAddTopic}></button>
                    </div>
                    <div className="modal-body">
                      <form onSubmit={handleCreateTopic}>
                        <div className="mb-3">
                          <label htmlFor="topicTitle" className="form-label">Topic Title</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            id="topicTitle"
                            value={newTopic.title}
                            onChange={(e) => setNewTopic(prev => ({ ...prev, title: e.target.value }))}
                            required
                          />
                        </div>
                        
                        <ul className="nav nav-tabs mb-3">
                          <li className="nav-item">
                            <button 
                              type="button"
                              className={`nav-link ${activeContentTab === 'manual' ? 'active' : ''}`}
                              onClick={() => setActiveContentTab('manual')}
                            >
                              Manual Entry
                            </button>
                          </li>
                          <li className="nav-item">
                            <button 
                              type="button"
                              className={`nav-link ${activeContentTab === 'ai' ? 'active' : ''}`}
                              onClick={() => setActiveContentTab('ai')}
                            >
                              Generate with AI
                            </button>
                          </li>
                        </ul>
                        
                        <div className="tab-content">
                          <div className={`tab-pane fade ${activeContentTab === 'manual' ? 'show active' : ''}`}>
                            <div className="mb-3">
                              <label htmlFor="topicDescription" className="form-label">Description</label>
                              <textarea 
                                className="form-control" 
                                id="topicDescription"
                                value={newTopic.description}
                                onChange={(e) => setNewTopic(prev => ({ ...prev, description: e.target.value }))}
                                rows="6"
                              />
                            </div>
                          </div>
                          <div className={`tab-pane fade ${activeContentTab === 'ai' ? 'show active' : ''}`}>
                            <div className="mb-3">
                              <label htmlFor="contentPrompt" className="form-label">Prompt for AI Content Generation</label>
                              <textarea 
                                className="form-control" 
                                id="contentPrompt"
                                value={contentPrompt}
                                onChange={(e) => setContentPrompt(e.target.value)}
                                placeholder="Describe what you want the AI to write about..."
                                rows="3"
                              />
                            </div>
                            <button 
                              type="button" 
                              className="btn btn-primary mb-3" 
                              onClick={handleGenerateContent}
                              disabled={isGeneratingContent || !contentPrompt.trim()}
                            >
                              {isGeneratingContent ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-magic me-2"></i>
                                  Generate Content
                                </>
                              )}
                            </button>
                            {generatedContent && (
                              <div className="mb-3">
                                <label className="form-label">Generated Content</label>
                                <div className="border p-3 bg-light" style={{ maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                  {generatedContent}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <label htmlFor="topicTags" className="form-label">Tags (comma separated)</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            id="topicTags"
                            value={newTopic.tags}
                            onChange={(e) => setNewTopic(prev => ({ ...prev, tags: e.target.value }))}
                            placeholder="e.g. ai, onboarding, training"
                          />
                        </div>
                        <button type="submit" className="btn btn-success me-2">
                          <i className="bi bi-check-circle me-1"></i>
                          Create Topic
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={handleCancelAddTopic}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Cancel
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {isAddingNote && (
              <div className="card mb-3">
                <div className="card-body">
                  <form onSubmit={handleAddNote}>
                    <ul className="nav nav-tabs mb-3">
                      <li className="nav-item">
                        <button 
                          type="button"
                          className={`nav-link ${activeNoteTab === 'manual' ? 'active' : ''}`}
                          onClick={() => setActiveNoteTab('manual')}
                        >
                          Manual Entry
                        </button>
                      </li>
                      <li className="nav-item">
                        <button 
                          type="button"
                          className={`nav-link ${activeNoteTab === 'ai' ? 'active' : ''}`}
                          onClick={() => setActiveNoteTab('ai')}
                        >
                          Generate with AI
                        </button>
                      </li>
                    </ul>
                    
                    <div className="tab-content">
                      <div className={`tab-pane fade ${activeNoteTab === 'manual' ? 'show active' : ''}`}>
                        <div className="mb-3">
                          <label htmlFor="newNote" className="form-label">New Note</label>
                          <textarea 
                            className="form-control" 
                            id="newNote"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            rows="3"
                            required
                          />
                        </div>
                      </div>
                      <div className={`tab-pane fade ${activeNoteTab === 'ai' ? 'show active' : ''}`}>
                        <div className="mb-3">
                          <label htmlFor="notePrompt" className="form-label">Prompt for AI Note Generation</label>
                          <textarea 
                            className="form-control" 
                            id="notePrompt"
                            value={contentPrompt}
                            onChange={(e) => setContentPrompt(e.target.value)}
                            placeholder="Describe what you want the AI to write about..."
                            rows="3"
                          />
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-primary mb-3" 
                          onClick={handleGenerateContent}
                          disabled={isGeneratingContent || !contentPrompt.trim()}
                        >
                          {isGeneratingContent ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-magic me-2"></i>
                              Generate Content
                            </>
                          )}
                        </button>
                        {generatedContent && (
                          <div className="mb-3">
                            <label className="form-label">Generated Content</label>
                            <div className="border p-3 bg-light" style={{ maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                              {generatedContent}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button type="submit" className="btn btn-primary me-2">
                      <i className="bi bi-check-circle me-1"></i>
                      Save Note
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={handleCancelAddNote}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid mt-4">
      <div className="row mb-4">
        <div className="col-12 text-center">
          <h1 className="display-4 text-primary">
            <i className="bi bi-database-fill me-3"></i>
            PostgreSQL Data Admin Tool
          </h1>
          <p className="lead text-muted">Manage your PostgreSQL databases with ease</p>
        </div>
      </div>
      
      {renderTabs()}
      
      {activeTab === 'manage' ? renderManageTab() : 
       activeTab === 'upload' ? renderUploadTab() : 
       renderKnowledgeBaseTab()}
    </div>
  );
}

export default App;
