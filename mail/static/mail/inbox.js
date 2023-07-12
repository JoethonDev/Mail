document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email());

  // By default, load the inbox
  load_mailbox('inbox');

  // Forms Submissions
  document.querySelector('#compose-form').addEventListener('submit', event => send_email(event));
});

function compose_email(email=null) {
  // Hide other views 
  hide_pages();

  // Show compose view
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  const recipients = document.querySelector('#compose-recipients')
  recipients.value = '';

  const subject = document.querySelector('#compose-subject')
  subject.value = '';

  const body = document.querySelector('#compose-body')
  body.value = '';

  // Fill values if it is reply
  if (email){
    const currentUser = document.querySelector('.form-control').value
    recipients.value = email.sender == currentUser ? email.recipients : email.sender ;

    // if (email.recipients.length == 1){
    // }
    // else{
    //   recipients.value = email.recipients;
    // }
    subject.value = email['subject'].search('Re: ') == -1 ? `Re: ${email.subject}` : email.subject;
    body.value = email['body'].search(`On ${email.timestamp} ${email.sender} wrote: `) == -1 ? `On ${email.timestamp} ${email.sender} wrote: ${email.body} ` : email.body;  
  }

  

  // Remove any alerts
  remove_alert();
}

function load_mailbox(mailbox) {
  
  // Hide other views 
  hide_pages();
  
  // Getting Email View
  let emailView = document.querySelector('#emails-view')

  // Show the mailbox
  emailView.style.display = 'block';

  // Show the mailbox name
  let html = `
    <h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>
    <ul class="list-group list-group-flush"></ul>
  `
  document.querySelector('#emails-view').innerHTML = html;

  // Making clickable ul
  document.querySelector('.list-group-flush').addEventListener('click', (event) => url_visit(event, mailbox));

  // Get emails from servers
  fetch(`emails/${mailbox}`)
  .then(response => response.json())
  .then(result => {
    // Loop through emails
    result.forEach((element) => {
      // Set Email into child nodes
      const sender = document.createElement('h5');
      sender.innerText = element.sender;

      const subject = document.createElement('span');
      subject.className = 'card-text';
      subject.innerText = element.subject;

      const timestamp = document.createElement('div');
      timestamp.className = 'text-muted';
      timestamp.innerText = element.timestamp;

      // Make Container of Email
      const card = document.createElement('li');
      card.className = 'list-group-item';
      card.dataset.id = element.id
      
      // Check if read
      if (element.read) {
        card.classList.add('read')
      }

      // Add child node to container
      card.append(sender);
      card.append(subject);
      card.append(timestamp);

      // Add Email to page
      document.querySelectorAll('.list-group-flush')[0].append(card);

    });
    
  })
}

function send_email(event) {
  event.preventDefault();
  remove_alert();

  let composeForm = document.querySelector('#compose-form');
  let recievers = document.querySelector('#compose-recipients').value;
  let subject = document.querySelector('#compose-subject').value;
  let content = document.querySelector('#compose-body').value;

  fetch('emails', {
    method : 'POST',
    body : JSON.stringify({
      'recipients' : recievers,
      'subject' : subject,
      'body' : content
    })
  })
  .then(response => response.json())
  .then(result => {
    const failed = document.createElement('div')
    if(result.error){
      failed.className = 'alert alert-danger';
      failed.innerText = result.error;
    }
    else{
      failed.className = 'alert alert-success';
      failed.innerText = result.message;
      setTimeout(() => load_mailbox('sent'), 1000);
    }
    composeForm.parentNode.insertBefore(failed, composeForm);
  })
}

function url_visit(event, mailbox) {
  // Hide Current Div && Show Email Template
  hide_pages()
  const emailView = document.querySelector('#single-email-view');
  emailView.style.display = "block";


  // Get ID of email
  let id = event.target.dataset.id;
  if (id == undefined){
    id = event.target.parentNode.dataset.id
  }

  // Get Data of this Email && Mark as Read
  fetch(`emails/${id}`)
  .then(response => response.json())
  .then(result => {
      if (result.error){
        pop_alert(false, result.error);
        return;
      }
      // Display Email content
      let archive = result.archived ? 'unarchived' : 'archive' ;
      const emailTemp = `
      <div id='email-template'>

        <h5>
          From : <span>${result.sender}</span>
        </h5>

        <h5>
          To : <span>${result.recipients}</span>
        </h5>

        <h5>
          Subject : <span>${result.subject}</span>
        </h5>

        <h5>
          Timestamp : <span>${result.timestamp}</span>
        </h5>

        <button class="btn btn-sm btn-outline-primary" id="reply">Reply</button>

      </div>

      <hr>

      <p>${result.body}</p>
      `
      emailView.innerHTML = emailTemp;

      // Archive Feature
      if (mailbox !== 'sent'){
        const archiveBtn = document.createElement('button');
        archiveBtn.className = 'btn btn-sm btn-outline-primary';
        archiveBtn.id = 'archive';
        archiveBtn.innerText = `${archive[0].toUpperCase() + archive.slice(1)}`;
        document.querySelector('#email-template').appendChild(archiveBtn);
        document.querySelector('#archive').addEventListener('click', (event) => archive_email(event, id));
      }


      //Add eventlistener to Reply 
      document.querySelector('#reply').addEventListener('click', () => compose_email(result));
      
      // TODO Mark as Read
      if (result.read){
        return result
      }
      return fetch(`emails/${id}`, {
        method : 'PUT',
        body : JSON.stringify({
          'read' : 'True'
        })
      });
  })
  .then(response => {
    if (response.status == 204){
      pop_alert(true, 'Email is read successfully!');
    }
  })

  return false
}


function archive_email(event, id) {
  const buttonText = event.target.innerText.toLowerCase();
  let state = false;
  if (buttonText == 'archive'){
    state = true;
  }
  console.log(id)

  fetch(`emails/${id}`, {
    method : 'PUT',
    body : JSON.stringify({
      'archived' : state
    })
  })
  .then(response => {
    if (response.status == 204){
      pop_alert(true, `Email is ${buttonText} successfully!`)
    }
  })

  setTimeout( () => load_mailbox('inbox'), 500);
  return false
}

// General Functions
function remove_alert() {
  document.querySelectorAll('.alert').forEach((element) => {
    element.remove();
  })
}

function hide_pages(){
  document.querySelectorAll('.page').forEach(element => {
    element.style.display = 'none';
  })
}

function pop_alert(condition, text) {
    const alert = document.createElement('div');
    alert.innerText = text;
    alert.className = 'alert popup';
    if (condition){
      alert.classList.add('alert-success');
    }
    else{
      alert.classList.add('alert-danger');
    }
    document.querySelector('.container').append(alert);
    setTimeout(remove_alert, 3000);

    return;
}