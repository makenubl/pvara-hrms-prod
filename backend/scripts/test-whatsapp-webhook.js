// Test WhatsApp Webhook
// Uses native fetch (Node 18+)

const testWebhook = async () => {
  const baseUrl = 'http://localhost:5000/api/whatsapp/webhook';
  
  const testCases = [
    {
      name: 'Help Command',
      body: {
        From: 'whatsapp:+923345224359',
        Body: 'help',
        ProfileName: 'Salman Yousafi'
      }
    },
    {
      name: 'Create Task',
      body: {
        From: 'whatsapp:+923345224359',
        Body: 'create task Review budget report by tomorrow',
        ProfileName: 'Salman Yousafi'
      }
    },
    {
      name: 'List Tasks',
      body: {
        From: 'whatsapp:+923345224359',
        Body: 'list tasks',
        ProfileName: 'Salman Yousafi'
      }
    },
    {
      name: 'Assign Task (Admin)',
      body: {
        From: 'whatsapp:+923345224359',
        Body: 'assign task Update documentation to Sadaqat Ali by friday',
        ProfileName: 'Salman Yousafi'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n=== Testing: ${testCase.name} ===`);
    console.log('Request:', testCase.body);
    
    try {
      const formBody = new URLSearchParams(testCase.body).toString();
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody
      });
      
      console.log('Response Status:', response.status);
      const responseText = await response.text();
      console.log('Response Body:', responseText);
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

testWebhook().then(() => {
  console.log('\n=== All tests completed ===');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
