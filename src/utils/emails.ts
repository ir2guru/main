// messages.ts

// Function to generate an invitation email
export const generateInviteMessage = (userId: string, groupId: string, memberId: string, groupName: string, inviteUrl: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Group Invitation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            padding: 20px;
        }
        .header {
            background: #007BFF;
            color: #ffffff;
            padding: 10px 20px;
            text-align: center;
        }
        .body {
            padding: 20px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            font-size: 16px;
            color: #ffffff;
            background-color: #007BFF;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Group Invitation</h1>
        </div>
        <div class="body">
            <p>Hi there,</p>
            <p>You've been invited to join the group <strong>${groupName}</strong>! Click the button below to accept your invite:</p>
            <a href="${inviteUrl}?userId=${userId}&groupId=${groupId}&memberId=${memberId}" class="button">Accept Invite</a>
            <p>If you have any questions, feel free to reply to this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Group. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

// Function to generate an email for an accepted invitation
export const generateAcceptedInvitationMessage = (userId: string, groupId: string, memberId: string, groupName: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation Accepted</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            padding: 20px;
        }
        .header {
            background: #28A745;
            color: #ffffff;
            padding: 10px 20px;
            text-align: center;
        }
        .body {
            padding: 20px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            font-size: 16px;
            color: #ffffff;
            background-color: #28A745;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invitation Accepted</h1>
        </div>
        <div class="body">
            <p>Hi there,</p>
            <p>We're excited to let you know that your invitation to join the group <strong>${groupName}</strong> has been accepted!</p>
            <p>Thank you for joining us. If you have any questions or need further assistance, feel free to reply to this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Group. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
