import React from 'react';
import {
  Edit, Trash2, Plus, HeartPulse, Activity, BrainCircuit, Bot, UtensilsCrossed,
  FileQuestion, BookOpenCheck, Dumbbell, Volume2, StopCircle, UserCheck, Shield,
 Send, Stethoscope, LogOut, Wrench, Sparkles, ChefHat, User, X
} from 'lucide-react';

import { initializeApp } from "https://esm.sh/firebase/app";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://esm.sh/firebase/auth";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, query, where, serverTimestamp, orderBy } from "https://esm.sh/firebase/firestore";
// WARNING: Hardcoding UIDs in production is a security risk. Use backend mechanisms
const BASE_ADMIN_UID = 'YOUR_BASE_ADMIN_UID';
const BASE_DOCTOR_UID = 'YOUR_BASE_DOCTOR_UID';

// --- FIREBASE CONFIGURATION ---
// IMPORTANT: Replace with your Firebase project's configuration if you have one.
const firebaseConfig = {
    apiKey: "AIzaSyAcVIRfEaXRQNkCydzRI99b4mHL2AohCwo",
    authDomain: "madhumeh-mitr.firebaseapp.com",
    projectId: "madhumeh-mitr",
    storageBucket: "madhumeh-mitr.appspot.com",
    messagingSenderId: "851963498178",
    appId: "1:851963498178:web:087246d635818125c4e492"
};

// --- DESIGNATED ADMIN EMAIL ---
const ADMIN_EMAIL = "admin@healthtracker.com";

// --- GEMINI API HELPER ---
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;


const callGeminiAPI = async (prompt, isJson = false) => {
  const model = 'gemini-2.5-flash-preview-05-20';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    ...(isJson && {
      generationConfig: {
        responseMimeType: "application/json",
      }
    })
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("API Error Response:", errorBody);
        throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
    } else {
        console.error("Unexpected API response structure:", data);
        throw new Error("Invalid response structure from API.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return `Error: ${error.message}. Please check the console for more details.`;
  }
};

// --- REUSABLE UI COMPONENTS ---
const SectionTitle = ({ title }) => <h2 className="text-4xl sm:text-5xl font-black text-gray-800 mb-8 tracking-tight text-center sm:text-left">{title}</h2>;
const LoadingSpinner = () => (
  <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gray-100">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    <p className="mt-4 text-lg font-semibold text-gray-600">Loading...</p>
  </div>
);
const ActionButton = ({ onClick, disabled, isLoading, loadingText, children, className, icon: Icon, type = 'button' }) => (
  <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`flex items-center justify-center gap-3 w-full p-4 text-xl font-bold text-white rounded-lg transition duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {isLoading ? (
      <>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        {loadingText}
      </>
    ) : (
      <>
        {Icon && <Icon />}
        {children}
      </>
    )}
  </button>
);
const Card = ({ children, className }) => <div className={`bg-white p-6 rounded-2xl shadow-lg border border-gray-200 ${className}`}>{children}</div>;
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                    <X size={24} />
                </button>
                <h3 className="text-2xl font-bold mb-4">{title}</h3>
                {children}
            </div>
        </div>
    );
};


// --- AUTHENTICATION COMPONENT ---
const AuthComponent = ({ showMessage, auth, db }) => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage("Logged in successfully!", 'success');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const role = email === ADMIN_EMAIL ? 'admin' : 'user';
        
        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          role: role,
          createdAt: serverTimestamp()
        });

        showMessage("Account created! Please log in.", 'success');
        setIsLogin(true);
      }
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-6xl font-black text-gray-800 tracking-tighter">AI Health Tracker</h1>
          <p className="text-xl text-gray-500 mt-2">Your intelligent wellness companion</p>
        </header>
        <Card>
          <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <ActionButton type="submit" isLoading={loading} loadingText={isLogin ? "Logging in..." : "Signing up..."} className="bg-blue-600 hover:bg-blue-700">
              {isLogin ? 'Login' : 'Sign Up'}
            </ActionButton>
          </form>
          <p className="mt-6 text-center text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold ml-2 hover:underline">
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
};


// --- PATIENT DASHBOARD & FEATURES ---
const PatientDashboard = ({ user, showMessage, handleSignOut, db }) => {
    const [activeTab, setActiveTab] = React.useState('health');
    const [healthRecords, setHealthRecords] = React.useState([]);
    const [symptoms, setSymptoms] = React.useState([]);
    const [healthFormData, setHealthFormData] = React.useState({ date: '', weight: '', bloodSugar: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', notes: '' });
    const [editingHealthId, setEditingHealthId] = React.useState(null);
    const [symptomFormData, setSymptomFormData] = React.useState({ date: '', description: '', severity: 'mild', notes: '' });
    const [editingSymptomId, setEditingSymptomId] = React.useState(null);
    
    // AI Feature States
    const [aiAnalysis, setAiAnalysis] = React.useState('');
    const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
    const [recipeSuggestions, setRecipeSuggestions] = React.useState([]);
    const [isLoadingRecipes, setIsLoadingRecipes] = React.useState(false);
    const [dietaryPreference, setDietaryPreference] = React.useState('');
    const [chatMessages, setChatMessages] = React.useState([]);
    const [chatInput, setChatInput] = React.useState('');
    const [isChatting, setIsChatting] = React.useState(false);
    const [mealDescription, setMealDescription] = React.useState('');
    const [mealAnalysis, setMealAnalysis] = React.useState('');
    const [isLoadingMealAnalysis, setIsLoadingMealAnalysis] = React.useState(false);
    const [doctorQuestions, setDoctorQuestions] = React.useState('');
    const [isLoadingDoctorQuestions, setIsLoadingDoctorQuestions] = React.useState(false);
    const [workoutPlan, setWorkoutPlan] = React.useState(null);
    const [isLoadingWorkout, setIsLoadingWorkout] = React.useState(false);
    const [workoutGoal, setWorkoutGoal] = React.useState('Weight Loss');
    const [fitnessLevel, setFitnessLevel] = React.useState('Beginner');

    // Doctor connection state
    const [doctors, setDoctors] = React.useState([]);
    const [myDoctorConnection, setMyDoctorConnection] = React.useState(null);

    // Fetch available doctors
    React.useEffect(() => {
        const doctorsCol = collection(db, "doctors");
        const unsubscribe = onSnapshot(doctorsCol, (snapshot) => {
            setDoctors(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return unsubscribe;
    }, []);

    // Fetch patient's connection status
    React.useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "connections"), where("patientId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const connectionData = snapshot.docs[0].data();
                setMyDoctorConnection({ ...connectionData, id: snapshot.docs[0].id });
            } else {
                setMyDoctorConnection(null);
            }
        });
        return unsubscribe;
    }, [user]);

    // Firestore data fetching for patient
    React.useEffect(() => {
        if (user) {
            const healthRecordsCol = collection(db, "users", user.uid, "healthRecords");
            const unsubscribeHealth = onSnapshot(healthRecordsCol, (snapshot) => {
                const sortedRecords = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => new Date(b.date) - new Date(a.date));
                setHealthRecords(sortedRecords);
            });

            const symptomsCol = collection(db, "users", user.uid, "symptoms");
            const unsubscribeSymptoms = onSnapshot(symptomsCol, (snapshot) => {
                const sortedSymptoms = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => new Date(b.date) - new Date(a.date));
                setSymptoms(sortedSymptoms);
            });

            return () => {
                unsubscribeHealth();
                unsubscribeSymptoms();
            };
        }
    }, [user]);

    // CRUD functions
    const handleHealthSubmit = async (e) => {
        e.preventDefault();
        if (editingHealthId) {
            const docRef = doc(db, "users", user.uid, "healthRecords", editingHealthId);
            await updateDoc(docRef, healthFormData);
            showMessage("Record updated!", 'success');
        } else {
            await addDoc(collection(db, "users", user.uid, "healthRecords"), healthFormData);
            showMessage("Record added!", 'success');
        }
        setEditingHealthId(null);
        setHealthFormData({ date: '', weight: '', bloodSugar: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', notes: '' });
    };
    const handleDeleteHealth = async (id) => {
        if(window.confirm("Are you sure you want to delete this record?")){
            const docRef = doc(db, "users", user.uid, "healthRecords", id);
            await deleteDoc(docRef);
            showMessage("Record deleted.", 'success');
        }
    };
    const handleSymptomSubmit = async (e) => {
        e.preventDefault();
        if (editingSymptomId) {
            const docRef = doc(db, "users", user.uid, "symptoms", editingSymptomId);
            await updateDoc(docRef, symptomFormData);
            showMessage("Symptom updated!", 'success');
        } else {
            await addDoc(collection(db, "users", user.uid, "symptoms"), symptomFormData);
            showMessage("Symptom added!", 'success');
        }
        setEditingSymptomId(null);
        setSymptomFormData({ date: '', description: '', severity: 'mild', notes: '' });
    };
    const handleDeleteSymptom = async (id) => {
        if(window.confirm("Are you sure you want to delete this symptom?")){
            const docRef = doc(db, "users", user.uid, "symptoms", id);
            await deleteDoc(docRef);
            showMessage("Symptom deleted.", 'success');
        }
    };
    
    // Doctor connection function
    const handleConnectToDoctor = async (doctorId) => {
        const doctor = doctors.find(d => d.id === doctorId);
        await addDoc(collection(db, "connections"), {
            patientId: user.uid,
            patientEmail: user.email,
            doctorId: doctorId,
            doctorEmail: doctor.email,
            status: 'pending',
            requestedAt: serverTimestamp()
        });
        showMessage("Connection request sent!", 'success');
    };
    
    // AI Feature Handlers
    const handleAnalyze = async () => {
        setIsLoadingAnalysis(true);
        const dataSummary = `Health Records: ${JSON.stringify(healthRecords.slice(0, 10))}. Symptoms: ${JSON.stringify(symptoms.slice(0,10))}.`;
        const prompt = `Based on the following recent health data, provide a brief, easy-to-understand analysis (max 3-4 sentences) of potential trends or areas to watch. Do not provide medical advice. Data: ${dataSummary}`;
        const result = await callGeminiAPI(prompt);
        setAiAnalysis(result);
        setIsLoadingAnalysis(false);
    };

    const handleGetRecipes = async () => {
        setIsLoadingRecipes(true);
        const prompt = `Provide 3 simple, healthy recipe ideas for someone with a dietary preference for "${dietaryPreference}". For each recipe, include a name, a short description, and a list of key ingredients. Format the response as a JSON array of objects, where each object has "name", "description", and "ingredients" (an array of strings) fields.`;
        const result = await callGeminiAPI(prompt, true);
        try {
            const parsedRecipes = JSON.parse(result);
            setRecipeSuggestions(parsedRecipes);
        } catch (e) {
            console.error("Failed to parse recipes:", e);
            showMessage("Could not get recipes. Please try again.", "error");
            setRecipeSuggestions([]);
        }
        setIsLoadingRecipes(false);
    };
    
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const userMessage = { role: 'user', content: chatInput };
        const newMessages = [...chatMessages, userMessage];
        setChatMessages(newMessages);
        setChatInput('');
        setIsChatting(true);

        const prompt = `You are a friendly AI health assistant. A user said: "${chatInput}". Provide a helpful, supportive, and safe response. Do not give medical advice. Keep it concise. Previous conversation: ${JSON.stringify(chatMessages.slice(-5))}`;
        const aiResponse = await callGeminiAPI(prompt);
        setChatMessages([...newMessages, { role: 'assistant', content: aiResponse }]);
        setIsChatting(false);
    };
    
    const handleMealAnalysis = async () => {
        setIsLoadingMealAnalysis(true);
        const prompt = `Analyze the following meal description for a general nutritional overview (calories, protein, carbs, fats). Be brief and provide estimates. Meal: "${mealDescription}"`;
        const result = await callGeminiAPI(prompt);
        setMealAnalysis(result);
        setIsLoadingMealAnalysis(false);
    };

    const handleGenerateWorkout = async () => {
        setIsLoadingWorkout(true);
        const prompt = `Create a 3-day sample workout plan for a ${fitnessLevel} individual with a goal of ${workoutGoal}. Format it clearly with days, exercises, sets, and reps.`;
        const result = await callGeminiAPI(prompt);
        setWorkoutPlan(result);
        setIsLoadingWorkout(false);
    };

    const handleGenerateQuestions = async () => {
        setIsLoadingDoctorQuestions(true);
        const dataSummary = `Health Records: ${JSON.stringify(healthRecords.slice(0,5))}. Symptoms: ${JSON.stringify(symptoms.slice(0,5))}.`;
        const prompt = `Based on this health data, generate a list of 5 relevant questions to ask a doctor at the next appointment. Data: ${dataSummary}`;
        const result = await callGeminiAPI(prompt);
        setDoctorQuestions(result);
        setIsLoadingDoctorQuestions(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tighter">My Dashboard</h1>
                    <p className="text-lg text-gray-500">{user.email}</p>
                </div>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                    <LogOut /> Sign Out
                </button>
            </header>
            
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8">
                <nav className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                    <TabButton icon={<Stethoscope />} label="Connect" isActive={activeTab === 'doctor'} onClick={() => setActiveTab('doctor')} />
                    <TabButton icon={<HeartPulse />} label="Vitals" isActive={activeTab === 'health'} onClick={() => setActiveTab('health')} />
                    <TabButton icon={<Activity />} label="Symptoms" isActive={activeTab === 'symptoms'} onClick={() => setActiveTab('symptoms')} />
                    <TabButton icon={<Sparkles />} label="AI Analysis" isActive={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
                    <TabButton icon={<ChefHat />} label="Recipes" isActive={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} />
                    <TabButton icon={<Bot />} label="Assistant" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                    <TabButton icon={<BookOpenCheck />} label="Meal Log" isActive={activeTab === 'mealLog'} onClick={() => setActiveTab('mealLog')} />
                    <TabButton icon={<Dumbbell />} label="Workout" isActive={activeTab === 'workout'} onClick={() => setActiveTab('workout')} />
                    <TabButton icon={<FileQuestion />} label="Doctor Prep" isActive={activeTab === 'doctorPrep'} onClick={() => setActiveTab('doctorPrep')} />
                </nav>

                <main className="bg-gray-50 rounded-2xl p-6 sm:p-8 min-h-[500px]">
                    {activeTab === 'doctor' && <DoctorConnectTab doctors={doctors} connection={myDoctorConnection} handleConnect={handleConnectToDoctor} currentUser={user} />}
                    {activeTab === 'health' && <HealthRecordsTab formData={healthFormData} setFormData={setHealthFormData} handleFormSubmit={handleHealthSubmit} records={healthRecords} handleEdit={(r) => { setEditingHealthId(r.id); setHealthFormData(r); }} handleDelete={handleDeleteHealth} editingId={editingHealthId} />}
                    {activeTab === 'symptoms' && <SymptomTrackerTab formData={symptomFormData} setFormData={setSymptomFormData} handleFormSubmit={handleSymptomSubmit} symptoms={symptoms} handleEdit={(s) => { setEditingSymptomId(s.id); setSymptomFormData(s); }} handleDelete={handleDeleteSymptom} editingId={editingSymptomId} />}
                    {activeTab === 'analysis' && <AIAnalysisTab analysis={aiAnalysis} isLoading={isLoadingAnalysis} handleAnalyze={handleAnalyze} hasData={healthRecords.length > 0 || symptoms.length > 0} />}
                    {activeTab === 'recipes' && <RecipeIdeasTab preference={dietaryPreference} setPreference={setDietaryPreference} suggestions={recipeSuggestions} isLoading={isLoadingRecipes} handleGetRecipes={handleGetRecipes} />}
                    {activeTab === 'chat' && <AIHealthAssistantTab messages={chatMessages} input={chatInput} setInput={setChatInput} handleSubmit={handleChatSubmit} isChatting={isChatting} />}
                    {activeTab === 'mealLog' && <MealLogTab description={mealDescription} setDescription={setMealDescription} analysis={mealAnalysis} isLoading={isLoadingMealAnalysis} handleAnalyze={handleMealAnalysis} />}
                    {activeTab === 'workout' && <WorkoutPlanTab workoutPlan={workoutPlan} isLoading={isLoadingWorkout} handleGenerate={handleGenerateWorkout} goal={workoutGoal} setGoal={setWorkoutGoal} level={fitnessLevel} setLevel={setFitnessLevel} />}
                    {activeTab === 'doctorPrep' && <DoctorPrepTab questions={doctorQuestions} isLoading={isLoadingDoctorQuestions} handleGenerate={handleGenerateQuestions} hasData={healthRecords.length > 0 || symptoms.length > 0} />}
                </main>
            </div>
        </div>
    );
};


// --- DOCTOR DASHBOARD COMPONENT ---
const DoctorDashboard = ({ user, showMessage, handleSignOut, db }) => {
    const [connectionRequests, setConnectionRequests] = React.useState([]);
    const [activePatients, setActivePatients] = React.useState([]);
    const [selectedPatient, setSelectedPatient] = React.useState(null);
    const [patientData, setPatientData] = React.useState({ records: [], symptoms: [] });
    const doctorChatEndRef = React.useRef(null);
    // Doctor Chat State
    const [doctorChatMessages, setDoctorChatMessages] = React.useState([]);
    const [doctorChatInput, setDoctorChatInput] = React.useState('');

    // Fetch connection requests and active patients for this doctor
    React.useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "connections"), where("doctorId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = [];
            const active = [];
            snapshot.docs.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                if (data.status === 'pending') {
                    requests.push(data);
                } else if (data.status === 'active') {
                    active.push(data);
                }
            });
            setConnectionRequests(requests);
            setActivePatients(active);
        });
        return unsubscribe;
    }, [user]);

    // Fetch data for the selected patient
    React.useEffect(() => {
        if (!selectedPatient) {
            setPatientData({ records: [], symptoms: [] });
            return;
        }

        const healthRecordsCol = collection(db, "users", selectedPatient.patientId, "healthRecords");
        const unsubscribeHealth = onSnapshot(healthRecordsCol, (snapshot) => {
            const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => new Date(b.date) - new Date(a.date));
            setPatientData(prev => ({ ...prev, records }));
        });

        const symptomsCol = collection(db, "users", selectedPatient.patientId, "symptoms");
        const unsubscribeSymptoms = onSnapshot(symptomsCol, (snapshot) => {
            const symptoms = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => new Date(b.date) - new Date(a.date));
            setPatientData(prev => ({ ...prev, symptoms }));
        });

        return () => {
            unsubscribeHealth();
            unsubscribeSymptoms();
        };
    }, [selectedPatient]);

    const handleConnection = async (connectionId, newStatus) => {
        const docRef = doc(db, "connections", connectionId);
        await updateDoc(docRef, { status: newStatus });
        showMessage(`Request ${newStatus === 'active' ? 'accepted' : 'declined'}.`, 'success');
    };

    // Fetch chat messages for the selected patient
    React.useEffect(() => {
        if (!selectedPatient) {
            setDoctorChatMessages([]);
            return;
        }

        const q = query(
            collection(db, "messages"),
            where("connectionId", "==", selectedPatient.id),
            orderBy("createdAt")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setDoctorChatMessages(messages);
        });

        return () => unsubscribe();
    }, [selectedPatient]);

    // Scroll to the bottom of the chat when messages change
    React.useEffect(() => {
        doctorChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [doctorChatMessages]);

    const handleSendDoctorMessage = async (e) => {
        e.preventDefault();
        if (!doctorChatInput.trim() || !selectedPatient) return;

        await addDoc(collection(db, "messages"), {
            connectionId: selectedPatient.id,
            senderId: user.uid,
            content: doctorChatInput,
            createdAt: serverTimestamp(),
        });
        setDoctorChatInput('');
    };
    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Doctor Dashboard</h1>
                    <p className="text-lg text-gray-500">{user.email}</p>
                </div>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                    <LogOut /> Sign Out
                </button>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h3 className="text-2xl font-bold mb-4">Connection Requests</h3>
                        {connectionRequests.length > 0 ? (
                            connectionRequests.map(req => (
                                <div key={req.id} className="p-3 bg-gray-100 rounded-lg mb-2">
                                    <p className="font-semibold">{req.patientEmail}</p>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => handleConnection(req.id, 'active')} className="w-full bg-green-500 text-white p-2 text-sm rounded-md hover:bg-green-600">Accept</button>
                                        <button onClick={() => handleConnection(req.id, 'declined')} className="w-full bg-red-500 text-white p-2 text-sm rounded-md hover:bg-red-600">Decline</button>
                                    </div>
                                </div>
                            ))
                        ) : <p className="text-gray-500">No new requests.</p>}
                    </Card>
                    <Card>
                        <h3 className="text-2xl font-bold mb-4">My Patients</h3>
                        {activePatients.length > 0 ? (
                            activePatients.map(p => (
                                <button key={p.id} onClick={() => setSelectedPatient(p)} className={`w-full text-left p-3 rounded-lg mb-2 ${selectedPatient?.id === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                    <p className="font-semibold">{p.patientEmail}</p>
                                </button>
                            ))
                        ) : <p className="text-gray-500">No active patients.</p>}
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        {selectedPatient ? (
                            <div>
                                <h3 className="text-3xl font-bold mb-4">Patient: {selectedPatient.patientEmail}</h3>
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xl font-semibold mb-2">Health Records</h4>
                                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                            {patientData.records.map(r => <div key={r.id} className="p-3 bg-gray-50 rounded-md"><p><strong>{r.date}:</strong> Weight: {r.weight}kg, Sugar: {r.bloodSugar}mg/dL, BP: {r.bloodPressureSystolic}/{r.bloodPressureDiastolic}</p></div>)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold mb-2">Symptoms</h4>
                                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                            {patientData.symptoms.map(s => <div key={s.id} className="p-3 bg-gray-50 rounded-md"><p><strong>{s.date}:</strong> {s.description} ({s.severity})</p></div>)}
                                        </div>
                                    </div>
                                    {/* Basic Chat UI Placeholder */}
                                    <div>
                                        <h4 className="text-xl font-semibold mb-2">Chat with Patient</h4>
 <div className="h-64 overflow-y-auto p-4 space-y-4 border rounded-lg bg-gray-50 mb-4">
                                            {doctorChatMessages.map((msg, index) => (
                                                <div key={index} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
 <p className={`p-2 rounded-lg max-w-xs ${msg.senderId === user.uid ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            ))}
                                            <div ref={doctorChatEndRef} />
                                        </div>
                                        <form onSubmit={handleSendDoctorMessage} className="flex gap-4">
                                            <input type="text" value={doctorChatInput} onChange={e => setDoctorChatInput(e.target.value)} placeholder="Type a message..." className="w-full p-3 border-2 rounded-lg" />
                                            <button type="submit" className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Send /></button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <h3 className="text-2xl font-bold text-gray-700">Select a patient to view their data.</h3>
                                <p className="text-gray-500 mt-2">You can manage connection requests and view patient information from this dashboard.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};


// --- ADMIN DASHBOARD COMPONENT ---
const AdminDashboard = ({ user, showMessage, handleSignOut, auth, db }) => {
    const [allUsers, setAllUsers] = React.useState([]);
    const [allDoctors, setAllDoctors] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [newProfileRole, setNewProfileRole] = React.useState('');
    const [newProfileEmail, setNewProfileEmail] = React.useState('');
    const [newProfilePassword, setNewProfilePassword] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);

    React.useEffect(() => {
        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeDoctors = onSnapshot(collection(db, "doctors"), (snapshot) => {
            setAllDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeUsers();
            unsubscribeDoctors();
        };
    }, []);

    const handleSendPasswordReset = async (userEmail) => {
        try {
            await sendPasswordResetEmail(auth, userEmail);
            showMessage(`Password reset link sent to ${userEmail}`, 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };
    
    const handleCreateNewProfile = (role) => {
        setNewProfileRole(role);
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            // Note: This creates the user in Auth, but for security, you'd typically use a backend function.
            // This is a simplified client-side approach for this example.
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
                method: 'POST',
                body: JSON.stringify({ email: newProfileEmail, password: newProfilePassword, returnSecureToken: true })
            });
            const data = await res.json();
            if(data.error) throw new Error(data.error.message);

            const uid = data.localId;
            const collectionName = newProfileRole === 'doctor' ? 'doctors' : 'users';
            
            await setDoc(doc(db, collectionName, uid), {
                uid: uid,
                email: newProfileEmail,
                role: newProfileRole,
                createdAt: serverTimestamp()
            });

            // Also add doctors to the 'users' collection for role lookup during login
            if (newProfileRole === 'doctor') {
                 await setDoc(doc(db, "users", uid), {
                    uid: uid,
                    email: newProfileEmail,
                    role: 'doctor',
                    createdAt: serverTimestamp()
                });
            }

            showMessage(`${newProfileRole} profile created successfully!`, 'success');
            setIsModalOpen(false);
            setNewProfileEmail('');
            setNewProfilePassword('');
        } catch (error) {
            showMessage(`Error creating profile: ${error.message}`, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleChangeRole = async (userToChange) => {
        const newRole = userToChange.role === 'user' ? 'doctor' : 'user';
        console.log('Attempting to change role for user:', userToChange.email, 'to', newRole);

        try {
            const userDocRef = doc(db, "users", userToChange.id);
            await updateDoc(userDocRef, { role: newRole });
            console.log(`Updated user role in 'users' collection for ${userToChange.email}`);

            // Placeholder logic for doctor collection management (requires backend in production)
            if (newRole === 'doctor') {
                // In a real app, you'd use a backend function to create a doctor doc securely
                // This client-side example is for illustration ONLY
                console.log(`Placeholder: Add ${userToChange.email} to 'doctors' collection.`);
                 await setDoc(doc(db, "doctors", userToChange.id), {
                    uid: userToChange.id,
                    email: userToChange.email,
                    createdAt: serverTimestamp() // Or copy existing createdAt if preferred
                });
            } else { // Changing from doctor to user
                 // In a real app, you'd use a backend function to delete the doctor doc securely
                 console.log(`Placeholder: Remove ${userToChange.email} from 'doctors' collection.`);
                 const doctorDocRef = doc(db, "doctors", userToChange.id);
                 await deleteDoc(doctorDocRef).catch(e => console.warn("Could not delete doctor doc (might not exist):", e));
            }

            showMessage(`Changed ${userToChange.email} role to ${newRole}.`, 'success');
        } catch (error) {
            console.error("Error changing user role:", error);
            showMessage(`Failed to change role for ${userToChange.email}: ${error.message}`, 'error');
        }
    };

    return (
        <>
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
             <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Admin Dashboard</h1>
                    <p className="text-lg text-gray-500">Logged in as: {user.email}</p>
                </div>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                    <LogOut /> Sign Out
                </button>
            </header>
                <SectionTitle title="Create New Profiles" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    <ActionButton onClick={() => handleCreateNewProfile('user')} className="bg-blue-600 hover:bg-blue-700" icon={User}>Create Patient</ActionButton>
                    <ActionButton onClick={() => handleCreateNewProfile('doctor')} className="bg-teal-600 hover:bg-teal-700" icon={Stethoscope}>Create Doctor</ActionButton>
                </div>

                <SectionTitle title="Manage Patients" />
                <div className="space-y-4 mb-8">
                    {allUsers.filter(u => u.role === 'user').map(u => (
                        <Card key={u.id} className="flex justify-between items-center">
                            <p className="font-bold text-lg">{u.email}</p>
                            <ActionButton onClick={() => handleSendPasswordReset(u.email)} className="bg-gray-500 hover:bg-gray-600 !w-auto px-4 py-2 text-sm" icon={Wrench}>Send Password Reset</ActionButton>
                        </Card>
                    ))}
                </div>

                <SectionTitle title="Manage Doctors" />
                 <div className="space-y-4 mb-8">
                    {allDoctors.map(doc => (
                         <Card key={doc.id} className="flex justify-between items-center">
                            <p className="font-bold text-lg">{doc.email}</p>
                            <ActionButton onClick={() => handleSendPasswordReset(doc.email)} className="bg-gray-500 hover:bg-gray-600 !w-auto px-4 py-2 text-sm" icon={Wrench}>Send Password Reset</ActionButton>
                         </Card>
                    ))}
                 </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Create New ${newProfileRole}`}>
                <form onSubmit={handleModalSubmit} className="space-y-4">
                    <input type="email" placeholder="Email" value={newProfileEmail} onChange={e => setNewProfileEmail(e.target.value)} className="w-full p-3 border-2 rounded-lg" required />
                    <input type="password" placeholder="Password" value={newProfilePassword} onChange={e => setNewProfilePassword(e.target.value)} className="w-full p-3 border-2 rounded-lg" required />
                    <ActionButton type="submit" isLoading={isCreating} loadingText="Creating..." className="bg-green-600 hover:bg-green-700">Create Profile</ActionButton>
                </form>
            </Modal>
        </>
    );
};
// --- MAIN APP ROUTER ---
export default function App() {
  const [message, setMessage] = React.useState({ text: '', type: '' });
  // Initialize Firebase within the component
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const [user, setUser] = React.useState(null);
  const [userRole, setUserRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const messageTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubscribeRole = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
              if (docSnapshot.data().role === 'doctor' && window.location.pathname !== '/doctor-dashboard') {
                // Removed automatic client-side redirect as per requirements to avoid navigation issues
              }
              setUserRole(docSnapshot.data().role);
          }
          setLoading(false);
        });
        return () => unsubscribeRole();
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      showMessage("Signed out successfully.", "success");
    }).catch((error) => {
      showMessage(error.message, "error");
    });
  };

  const renderDashboard = () => {
      switch(userRole) {
          case 'admin':
              return <AdminDashboard user={user} showMessage={showMessage} handleSignOut={handleSignOut} auth={auth} db={db} />;
          case 'doctor':
              return <DoctorDashboard user={user} showMessage={showMessage} handleSignOut={handleSignOut} db={db} />;
          case 'user':
          default:
              return <PatientDashboard user={user} showMessage={showMessage} handleSignOut={handleSignOut} db={db} />;
      }
  };

  if (loading) {
      return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 font-sans">
      {message.text && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg font-bold text-lg shadow-xl animate-fade-in-down ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {message.text}
        </div>
      )}
      {!user ? <AuthComponent showMessage={showMessage} auth={auth} db={db} /> : renderDashboard()}
    </div>
  );
}

// --- FULLY IMPLEMENTED TAB COMPONENTS ---

const TabButton = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 ${isActive ? 'bg-gray-800 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
    {React.cloneElement(icon, { className: "h-5 w-5" })}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const HealthRecordsTab = ({ formData, setFormData, handleFormSubmit, records, handleEdit, handleDelete, editingId }) => {
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    return (
        <div>
            <SectionTitle title="Log Your Vitals" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <h3 className="text-2xl font-bold mb-4">{editingId ? 'Edit Record' : 'Add New Record'}</h3>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-3 border-2 rounded-lg" required />
                        <input type="number" name="weight" placeholder="Weight (kg)" value={formData.weight} onChange={handleChange} className="w-full p-3 border-2 rounded-lg" />
                        <input type="number" name="bloodSugar" placeholder="Blood Sugar (mg/dL)" value={formData.bloodSugar} onChange={handleChange} className="w-full p-3 border-2 rounded-lg" />
                        <div className="flex gap-4">
                            <input type="number" name="bloodPressureSystolic" placeholder="BP Systolic" value={formData.bloodPressureSystolic} onChange={handleChange} className="w-full p-3 border-2 rounded-lg" />
                            <input type="number" name="bloodPressureDiastolic" placeholder="BP Diastolic" value={formData.bloodPressureDiastolic} onChange={handleChange} className="w-full p-3 border-2 rounded-lg" />
                        </div>
                        <textarea name="notes" placeholder="Notes..." value={formData.notes} onChange={handleChange} className="w-full p-3 border-2 rounded-lg h-24"></textarea>
                        <ActionButton type="submit" className="bg-blue-600 hover:bg-blue-700" icon={Plus}>{editingId ? 'Update Record' : 'Add Record'}</ActionButton>
                    </form>
                </Card>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {records.map(r => (
                        <Card key={r.id} className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg">{r.date}</p>
                                <p className="text-gray-600">Weight: {r.weight}kg | BP: {r.bloodPressureSystolic}/{r.bloodPressureDiastolic}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(r)} className="p-2 bg-yellow-400 text-white rounded-full hover:bg-yellow-500"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><Trash2 size={18} /></button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SymptomTrackerTab = ({ formData, setFormData, handleFormSubmit, symptoms, handleEdit, handleDelete, editingId }) => {
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    return (
        <div>
            <SectionTitle title="Track Your Symptoms" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <h3 className="text-2xl font-bold mb-4">{editingId ? 'Edit Symptom' : 'Add New Symptom'}</h3>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-3 border-2 rounded-lg" required />
                        <input type="text" name="description" placeholder="Symptom (e.g., Headache)" value={formData.description} onChange={handleChange} className="w-full p-3 border-2 rounded-lg" required />
                        <select name="severity" value={formData.severity} onChange={handleChange} className="w-full p-3 border-2 rounded-lg">
                            <option value="mild">Mild</option>
                            <option value="moderate">Moderate</option>
                            <option value="severe">Severe</option>
                        </select>
                        <textarea name="notes" placeholder="Notes..." value={formData.notes} onChange={handleChange} className="w-full p-3 border-2 rounded-lg h-24"></textarea>
                        <ActionButton type="submit" className="bg-green-600 hover:bg-green-700" icon={Plus}>{editingId ? 'Update Symptom' : 'Add Symptom'}</ActionButton>
                    </form>
                </Card>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {symptoms.map(s => (
                        <Card key={s.id} className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg">{s.description} <span className="text-sm font-normal text-gray-500">({s.severity})</span></p>
                                <p className="text-gray-600">{s.date}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(s)} className="p-2 bg-yellow-400 text-white rounded-full hover:bg-yellow-500"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(s.id)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><Trash2 size={18} /></button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AIAnalysisTab = ({ analysis, isLoading, handleAnalyze, hasData }) => (
    <div className="text-center">
        <SectionTitle title="AI Health Analysis" />
        <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-8">Get an AI-powered summary of your health trends based on your logged vitals and symptoms. This is not medical advice.</p>
        <ActionButton onClick={handleAnalyze} disabled={!hasData || isLoading} isLoading={isLoading} loadingText="Analyzing..." className="bg-purple-600 hover:bg-purple-700 max-w-sm mx-auto" icon={Sparkles}>
            Analyze My Health
        </ActionButton>
        {!hasData && <p className="mt-4 text-yellow-600 font-semibold">Please add some health records or symptoms to get an analysis.</p>}
        {analysis && <Card className="mt-8 text-left max-w-3xl mx-auto"><p className="text-lg whitespace-pre-wrap">{analysis}</p></Card>}
    </div>
);

const RecipeIdeasTab = ({ preference, setPreference, suggestions, isLoading, handleGetRecipes }) => (
    <div className="text-center">
        <SectionTitle title="Healthy Recipe Ideas" />
        <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-8">Tell us your dietary preferences, and our AI will suggest some simple, healthy recipes for you.</p>
        <div className="max-w-md mx-auto flex gap-4">
            <input type="text" value={preference} onChange={e => setPreference(e.target.value)} placeholder="e.g., Low-carb, vegetarian" className="w-full p-4 text-lg border-2 rounded-lg" />
            <ActionButton onClick={handleGetRecipes} disabled={!preference || isLoading} isLoading={isLoading} loadingText="Finding..." className="bg-orange-500 hover:bg-orange-600 !w-auto px-6" icon={ChefHat} />
        </div>
        {suggestions.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {suggestions.map((recipe, index) => 
                    <Card key={index}>
                        <h4 className="font-bold text-xl mb-2">{recipe.name}</h4>
                        <p className="text-gray-700 mb-3">{recipe.description}</p>
                        <ul className="list-disc list-inside text-gray-600">
                            {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                        </ul>
                    </Card>
                )}
            </div>
        )}
    </div>
);

const AIHealthAssistantTab = ({ messages, input, setInput, handleSubmit, isChatting }) => {
    const chatEndRef = React.useRef(null);
    React.useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isChatting]);

    return (
        <div>
            <SectionTitle title="AI Health Assistant" />
            <Card className="max-w-3xl mx-auto">
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && <p className="text-center text-gray-500">Ask me anything about general wellness!</p>}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <p className={`p-3 rounded-2xl max-w-sm ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>{msg.content}</p>
                        </div>
                    ))}
                    {isChatting && <div className="flex justify-start"><p className="p-3 rounded-2xl bg-gray-200">...</p></div>}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSubmit} className="flex gap-4 p-4 border-t">
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="w-full p-3 border-2 rounded-lg" />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Send /></button>
                </form>
            </Card>
        </div>
    );
};

const MealLogTab = ({ description, setDescription, analysis, isLoading, handleAnalyze }) => (
    <div className="text-center">
        <SectionTitle title="Analyze Your Meal" />
        <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-8">Describe what you ate, and our AI will provide a general nutritional overview.</p>
        <Card className="max-w-xl mx-auto">
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Grilled chicken salad with avocado, tomatoes, and a light vinaigrette." className="w-full p-3 border-2 rounded-lg h-32 mb-4"></textarea>
            <ActionButton onClick={handleAnalyze} disabled={!description || isLoading} isLoading={isLoading} loadingText="Analyzing..." className="bg-teal-500 hover:bg-teal-600" icon={BookOpenCheck}>
                Analyze Meal
            </ActionButton>
        </Card>
        {analysis && <Card className="mt-8 text-left max-w-xl mx-auto"><p className="whitespace-pre-wrap">{analysis}</p></Card>}
    </div>
);

const WorkoutPlanTab = ({ workoutPlan, isLoading, handleGenerate, goal, setGoal, level, setLevel }) => (
    <div className="text-center">
        <SectionTitle title="AI Workout Planner" />
        <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-8">Select your goal and fitness level to generate a personalized workout plan.</p>
        <Card className="max-w-xl mx-auto">
            <div className="flex gap-4 mb-4">
                <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full p-3 border-2 rounded-lg">
                    <option>Weight Loss</option>
                    <option>Muscle Gain</option>
                    <option>General Fitness</option>
                </select>
                <select value={level} onChange={e => setLevel(e.target.value)} className="w-full p-3 border-2 rounded-lg">
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                </select>
            </div>
            <ActionButton onClick={handleGenerate} disabled={isLoading} isLoading={isLoading} loadingText="Generating..." className="bg-gray-800 hover:bg-gray-900" icon={Dumbbell}>
                Generate Plan
            </ActionButton>
        </Card>
        {workoutPlan && <Card className="mt-8 text-left max-w-3xl mx-auto"><p className="whitespace-pre-wrap">{workoutPlan}</p></Card>}
    </div>
);

const DoctorPrepTab = ({ questions, isLoading, handleGenerate, hasData }) => (
    <div className="text-center">
        <SectionTitle title="Prepare for Your Doctor" />
        <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-8">Use AI to generate relevant questions for your next doctor's appointment based on your logged data.</p>
        <ActionButton onClick={handleGenerate} disabled={!hasData || isLoading} isLoading={isLoading} loadingText="Generating..." className="bg-sky-600 hover:bg-sky-700 max-w-sm mx-auto" icon={FileQuestion}>
            Generate Questions
        </ActionButton>
        {!hasData && <p className="mt-4 text-yellow-600 font-semibold">Log some data first to get personalized questions.</p>}
        {questions && <Card className="mt-8 text-left max-w-3xl mx-auto"><p className="whitespace-pre-wrap">{questions}</p></Card>}
    </div>
);

const DoctorConnectTab = ({ doctors, connection, handleConnect, currentUser }) => {
    return (
        <div>
            <SectionTitle title="Connect with a Doctor" />
            {!connection ? (
                <div>
                    <h3 className="text-2xl font-bold mb-4">Available Doctors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doctors.map(doc => (
                            <Card key={doc.id}>
                                <p className="font-bold text-lg">{doc.email}</p>
                                <button onClick={() => handleConnect(doc.id)} className="mt-2 w-full bg-blue-500 text-white p-2 rounded-lg font-semibold hover:bg-blue-600">Request Connection</button>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : (
                <Card className="max-w-2xl mx-auto text-center">
                    <h3 className="text-2xl font-bold mb-1">My Doctor: <span className="text-blue-600">{connection.doctorEmail}</span></h3>
                    <p className="text-lg mb-4">Status: <span className={`font-bold capitalize ${connection.status === 'active' ? 'text-green-600' : connection.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>{connection.status}</span></p>
                    {connection.status === 'pending' && <p className="p-4 bg-yellow-100 rounded-lg">Your connection request is pending approval.</p>}
                    {connection.status === 'active' && <p className="p-4 bg-green-100 rounded-lg">You are connected! Your doctor can now view your health data.</p>}
                    {connection.status === 'declined' && <p className="p-4 bg-red-100 rounded-lg">Your connection request was declined. You can connect with another doctor.</p>}
                </Card>
            )}
        </div>
    );
};
