async function awsAgent(prompt) {

    const systemPrompt = `
    You are an AWS Solutions Architect.
    Analyze AWS architecture questions.
    Recommend secure and cost optimized solutions.
    `;

    return {
        role: "AWS Architect",
        prompt: systemPrompt + "\nUser: " + prompt
    };
}

module.exports = awsAgent;