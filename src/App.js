import React from 'react';
import {
  Edit, Trash2, Plus, HeartPulse, Activity, BrainCircuit, Bot, UtensilsCrossed,
  FileQuestion, BookOpenCheck, Dumbbell, Volume2, StopCircle, UserCheck, Shield,
  Send, Users, Stethoscope, LogOut, MessageSquare, Wrench, Sparkles, ChefHat
} from 'lucide-react';
import { getPerformance } from "https://esm.sh/firebase/performance";
import { initializeApp } from "https://esm.sh/firebase/app";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://esm.sh/firebase/auth";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from "https://esm.sh/firebase/firestore";

// --- FIREBASE CONFIGURATION ---
// IMPORTANT: Replace with your Firebase project's configuration.
const firebaseConfig = { 
  apiKey: "AIzaSyAcVIRfEaXRQNkCydzRI99b4mHL2AohCwo",
  authDomain: "madhumeh-mitr.firebaseapp.com",
  projectId: "madhumeh-mitr",
  storageBucket: "madhumeh-mitr.appspot.com",
  messagingSenderId: "851963498178",
  appId: "1:851963498178:web:087246d635818125c4e492"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const perf = getPerformance(app);
const auth = getAuth(app);
const db = getFirestore(app);


// --- GEMINI API HELPER ---
const API_KEY = ""; // IMPORTANT: Leave this empty.

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
    return `Error: ${error.message}. Please check the console for more details. Ensure your API key is correctly configured.`;
  }
};

// --- HELPER FUNCTIONS FOR TTS ---
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function pcmToWav(pcmData, sampleRate) {
  const pcm16 = new Int16Array(pcmData);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  view.setUint32(0, 1380533830, false); // "RIFF"
  view.setUint32(4, 36 + pcm16.length * 2, true);
  view.setUint32(8, 1463899717, false); // "WAVE"
  view.setUint32(12, 1718449184, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 1684108385, false); // "data"
  view.setUint32(40, pcm16.length * 2, true);
  return new Blob([header, pcm16], { type: 'audio/wav' });
}

// --- REUSABLE UI COMPONENTS ---
const SectionTitle = ({ title }) => <h2 className="text-4xl sm:text-5xl font-black text-gray-800 mb-8 tracking-tight text-center sm:text-left">{title}</h2>;
const LoadingSpinner = () => (
  <div className="min-h-screen w-full flex flex-col justify-center items-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    <p className="mt-4 text-lg font-semibold text-gray-600">Loading...</p>
  </div>
);
const ActionButton = ({ onClick, disabled, isLoading, loadingText, children, className, icon: Icon }) => (
  <button onClick={onClick} disabled={disabled || isLoading} className={`flex items-center justify-center gap-3 w-full p-4 text-xl font-bold text-white rounded-lg transition duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
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

// --- AUTHENTICATION COMPONENT ---
const AuthComponent = ({ showMessage }) => {
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
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage("Account created! Please log in.", 'success');
        setIsLogin(true); // Switch to login view after signup
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg" required />
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
const PatientDashboard = ({ user, showMessage, handleSignOut }) => {
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
    const chatMessagesEndRef = React.useRef(null);
    const [mealDescription, setMealDescription] = React.useState('');
    const [mealAnalysis, setMealAnalysis] = React.useState('');
    const [isLoadingMealAnalysis, setIsLoadingMealAnalysis] = React.useState(false);
    const [doctorQuestions, setDoctorQuestions] = React.useState('');
    const [isLoadingDoctorQuestions, setIsLoadingDoctorQuestions] = React.useState(false);
    const [workoutPlan, setWorkoutPlan] = React.useState(null);
    const [isLoadingWorkout, setIsLoadingWorkout] = React.useState(false);
    const [workoutGoal, setWorkoutGoal] = React.useState('Weight Loss');
    const [fitnessLevel, setFitnessLevel] = React.useState('Beginner');
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const audioPlayerRef = React.useRef(null);

    // Doctor connection state with mock data
    const [doctors, setDoctors] = React.useState([
        { id: 'doc1', email: 'dr.smith@example.com' },
        { id: 'doc2', email: 'dr.jones@example.com' },
    ]);
    const [myDoctorConnection, setMyDoctorConnection] = React.useState(null);
    const [doctorChatMessages, setDoctorChatMessages] = React.useState([]);
    const [doctorChatInput, setDoctorChatInput] = React.useState('');
    const [isSendingDoctorMessage, setIsSendingDoctorMessage] = React.useState(false);

    // Firestore data fetching
    React.useEffect(() => {
        if (user) {
            const healthRecordsCol = collection(db, "users", user.uid, "healthRecords");
            const unsubscribeHealth = onSnapshot(healthRecordsCol, (snapshot) => {
                setHealthRecords(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });

            const symptomsCol = collection(db, "users", user.uid, "symptoms");
            const unsubscribeSymptoms = onSnapshot(symptomsCol, (snapshot) => {
                setSymptoms(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
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
        const docRef = doc(db, "users", user.uid, "healthRecords", id);
        await deleteDoc(docRef);
        showMessage("Record deleted.", 'success');
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
        const docRef = doc(db, "users", user.uid, "symptoms", id);
        await deleteDoc(docRef);
        showMessage("Symptom deleted.", 'success');
    };
    
    // Doctor connection functions
    const handleConnectToDoctor = (doctorId) => {
        const doctor = doctors.find(d => d.id === doctorId);
        setMyDoctorConnection({ doctor, status: 'pending' });
        showMessage("Connection request sent!", 'success');
    };
    const handleSendDoctorMessage = (e) => {
        e.preventDefault();
        if (!doctorChatInput.trim()) return;
        const newMessage = { id: Date.now(), content: doctorChatInput, sender_id: user.id };
        setDoctorChatMessages([...doctorChatMessages, newMessage]);
        setDoctorChatInput('');
    };
    
    // AI Feature Handlers
    const handleAnalyze = async () => {
        setIsLoadingAnalysis(true);
        const dataSummary = `Health Records: ${JSON.stringify(healthRecords)}. Symptoms: ${JSON.stringify(symptoms)}.`;
        const prompt = `Based on the following health data, provide a brief, easy-to-understand analysis (max 3-4 sentences) of potential trends or areas to watch. Do not provide medical advice. Data: ${dataSummary}`;
        const result = await callGeminiAPI(prompt);
        setAiAnalysis(result);
        setIsLoadingAnalysis(false);
    };

    const handleGetRecipes = async () => {
        setIsLoadingRecipes(true);
        const prompt = `Provide 3 simple, healthy recipe ideas for someone with a dietary preference for "${dietaryPreference}". For each recipe, include a name, a short description, and a list of key ingredients.`;
        const result = await callGeminiAPI(prompt);
        const recipes = result.split(/\d\./).slice(1).map(r => r.trim());
        setRecipeSuggestions(recipes);
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

        const prompt = `You are a friendly AI health assistant. A user said: "${chatInput}". Provide a helpful, supportive, and safe response. Do not give medical advice. Keep it concise. Previous conversation: ${JSON.stringify(chatMessages)}`;
        const aiResponse = await callGeminiAPI(prompt);
        setChatMessages([...newMessages, { role: 'assistant', content: aiResponse }]);
        setIsChatting(false);
    };
    
    const handleMealAnalysis = async () => {
        setIsLoadingMealAnalysis(true);
        const prompt = `Analyze the following meal description for a general nutritional overview. Meal: "${mealDescription}"`;
        const result = await callGeminiAPI(prompt);
        setMealAnalysis(result);
        setIsLoadingMealAnalysis(false);
    };

    const handleGenerateWorkout = async () => {
        setIsLoadingWorkout(true);
        const prompt = `Create a 3-day sample workout plan for a ${fitnessLevel} with a goal of ${workoutGoal}. Format it clearly with days, exercises, sets, and reps.`;
        const result = await callGeminiAPI(prompt);
        setWorkoutPlan(result);
        setIsLoadingWorkout(false);
    };

    const handleGenerateQuestions = async () => {
        setIsLoadingDoctorQuestions(true);
        const dataSummary = `Health Records: ${JSON.stringify(healthRecords)}. Symptoms: ${JSON.stringify(symptoms)}.`;
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
                    {activeTab === 'doctor' && <DoctorConnectTab doctors={doctors} connection={myDoctorConnection} handleConnect={handleConnectToDoctor} messages={doctorChatMessages} input={doctorChatInput} setInput={setDoctorChatInput} handleSend={handleSendDoctorMessage} isSending={isSendingDoctorMessage} currentUser={user} />}
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


// --- MAIN APP ROUTER ---
export default function App() {
  const [message, setMessage] = React.useState({ text: '', type: '' });
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const messageTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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

  if (loading) {
      return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 font-inter">
      {message.text && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg font-bold text-lg shadow-xl ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {message.text}
        </div>
      )}
      {!user ? (
        <AuthComponent showMessage={showMessage} />
      ) : (
        <PatientDashboard user={user} showMessage={showMessage} handleSignOut={handleSignOut} />
      )}
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
                <div className="space-y-4">
                    {records.map(r => (
                        <Card key={r.id} className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg">{r.date}</p>
                                <p className="text-gray-600">Weight: {r.weight}kg | BP: {r.bloodPressureSystolic}/{r.bloodPressureDiastolic}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(r)} className="p-2 bg-yellow-400 text-white rounded-full"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-500 text-white rounded-full"><Trash2 size={18} /></button>
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
                <div className="space-y-4">
                    {symptoms.map(s => (
                        <Card key={s.id} className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg">{s.description} <span className="text-sm font-normal text-gray-500">({s.severity})</span></p>
                                <p className="text-gray-600">{s.date}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(s)} className="p-2 bg-yellow-400 text-white rounded-full"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(s.id)} className="p-2 bg-red-500 text-white rounded-full"><Trash2 size={18} /></button>
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
        {!hasData && <p className="mt-4 text-yellow-600">Please add some health records or symptoms to get an analysis.</p>}
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
                {suggestions.map((recipe, index) => <Card key={index}><p className="whitespace-pre-wrap">{recipe}</p></Card>)}
            </div>
        )}
    </div>
);

const AIHealthAssistantTab = ({ messages, input, setInput, handleSubmit, isChatting }) => (
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
            </div>
            <form onSubmit={handleSubmit} className="flex gap-4 p-4 border-t">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="w-full p-3 border-2 rounded-lg" />
                <button type="submit" className="p-3 bg-blue-600 text-white rounded-lg"><Send /></button>
            </form>
        </Card>
    </div>
);

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
        {!hasData && <p className="mt-4 text-yellow-600">Log some data first to get personalized questions.</p>}
        {questions && <Card className="mt-8 text-left max-w-3xl mx-auto"><p className="whitespace-pre-wrap">{questions}</p></Card>}
    </div>
);

const DoctorConnectTab = ({ doctors, connection, handleConnect, messages, input, setInput, handleSend, isSending, currentUser }) => {
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
                <Card className="max-w-2xl mx-auto">
                    <h3 className="text-2xl font-bold mb-1">My Doctor: <span className="text-blue-600">{connection.doctor.email}</span></h3>
                    <p className="text-lg mb-4">Status: <span className={`font-bold capitalize ${connection.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>{connection.status}</span></p>
                    {connection.status === 'pending' && <p className="text-center p-4 bg-yellow-100 rounded-lg">Your connection request is pending approval.</p>}
                </Card>
            )}
        </div>
    );
};
