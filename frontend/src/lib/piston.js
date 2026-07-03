// Judge0 CE API is a free, fast, public service for code execution (https://ce.judge0.com)
const JUDGE0_API = "https://ce.judge0.com";

const LANGUAGE_MAPPING = {
  javascript: 93, // Node.js 18.15.0
  python: 92,     // Python 3.11.2
  java: 91,       // Java (JDK 17.0.6)
};

/**
 * @param {string} language - programming language
 * @param {string} code - source code to executed
 * @returns {Promise<{success:boolean, output?:string, error?: string}>}
 */
export async function executeCode(language, code) {
  try {
    const languageId = LANGUAGE_MAPPING[language];

    if (!languageId) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    const response = await fetch(`${JUDGE0_API}/submissions?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();

    const stdout = data.stdout || "";
    const stderr = data.stderr || "";
    const compileOutput = data.compile_output || "";
    const message = data.message || "";
    const isAccepted = data.status && data.status.id === 3;

    if (!isAccepted) {
      return {
        success: false,
        output: stdout,
        error: stderr || compileOutput || message || "Execution failed",
        time: data.time,
        memory: data.memory,
        statusDescription: data.status?.description || "Failed",
      };
    }

    return {
      success: true,
      output: stdout || "No output",
      time: data.time,
      memory: data.memory,
      statusDescription: data.status?.description || "Accepted",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute code: ${error.message}`,
    };
  }
}


