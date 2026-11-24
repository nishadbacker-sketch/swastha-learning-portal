"use client";

export type CourseCertificate={
 id:string;
 registration_id:string;
 student_id:string;
 student_name:string;
 student_code:string;
 course_title:string;
 completion_date:string;
 reference_code:string;
 issued_at:string;
 programme_coordinator:string;
 approving_director:string;
};

export type AssessmentCertificate={
 id:string;assignment_id:string;student_id:string;student_name:string;student_code:string;
 assessment_title:string;assessment_level:string;completion_date:string;reference_code:string;
 issued_at:string;programme_coordinator:string;approving_director:string;
};
type CertificateKind="course"|"assessment";
const verificationBase="https://portal.swasthalearning.com/verify/certificate/";
export function courseCertificateVerificationUrl(reference:string){
 return verificationBase+encodeURIComponent(reference);
}


/**
 * The uploaded Swastha template is a single exact background bitmap.
 * Keep all original geometric corners, logo, branding, type and border;
 * replace only sample fields and the non-functional QR.
 *
 * The source PNG must live at public/certificate-assets/approved-certificate-template.png.
 * Until the authorised asset is present, the previous working PDF remains the fallback.
 */
const approvedTemplateUrl="/certificate-assets/approved-certificate-template.png";
async function loadApprovedCertificateTemplate():Promise<HTMLImageElement|null>{
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>resolve(null);
  image.src=approvedTemplateUrl;
 });
}
async function drawApprovedTemplate(
 pdf:import("jspdf").jsPDF,
 image:HTMLImageElement,
 c:CourseCertificate,
 QRCode:typeof import("qrcode"),
 kind:CertificateKind="course"
){
 const width=297,height=220;
 const sx=(x:number)=>x*width/1345;
 const sy=(y:number)=>y*height/996;
 const box=(left:number,top:number,right:number,bottom:number,colour:[number,number,number]=[255,255,255])=>{
  pdf.setFillColor(...colour);
  pdf.rect(sx(left),sy(top),sx(right-left),sy(bottom-top),"F");
 };
 const drawCentered=(text:string,x:number,y:number,maxWidth:number,initialSize:number,colour:[number,number,number],style:"normal"|"bold"|"italic"|"bolditalic"="normal",family="helvetica")=>{
  pdf.setFont(family,style);
  let size=initialSize;
  pdf.setFontSize(size);
  while(pdf.getTextWidth(text)>sx(maxWidth)&&size>7){
   size-=0.5;
   pdf.setFontSize(size);
  }
  pdf.setTextColor(...colour);
  pdf.text(text,sx(x),sy(y),{align:"center"});
 };
 pdf.addImage(image,"PNG",0,0,width,height);
 // Erase only placeholder text regions from the exact background photograph.
 if(kind==="assessment"){
  box(280,588,1080,640);
  drawCentered("FOR SUCCESSFULLY COMPLETING THE ASSESSMENT",683,623,790,10,[42,51,47],"bold");
 }
  box(350,482,1040,583);
 drawCentered(c.student_name,695,544,670,31,[6,89,48],"italic","times");
 drawCentered("Student ID: "+c.student_code,695,568,620,9,[38,49,46]);
 box(489,654,875,701,[3,91,50]);
 drawCentered(c.course_title,683,690,620,20,[255,255,255],"bolditalic","times");
 // No signature illustration: real authoriser names appear below their designation.
 box(190,818,510,892);
 box(619,818,1005,892);
 drawCentered("Programme Coordinator",356,850,310,11,[4,92,49],"bold");
 drawCentered(c.programme_coordinator,356,881,315,9,[46,49,48]);
 drawCentered("Director",820,850,370,11,[4,92,49],"bold");
 drawCentered(c.approving_director,820,881,370,9,[46,49,48]);
 // Keep the source's original issue-date/reference headings, replace example values.
 box(282,938,430,984);
 drawCentered(new Date(c.issued_at).toLocaleDateString("en-GB",{timeZone:"Asia/Kolkata"}),356,968,151,9,[35,43,41]);
 box(785,936,1008,980);
 drawCentered(c.reference_code,896,967,221,7,[35,43,41]);
 // The raster QR was only a mock-up; substitute the real unpredictable reference URL.
 box(1082,769,1255,935);
 const qr=await QRCode.toDataURL(courseCertificateVerificationUrl(c.reference_code),{width:512,margin:1,errorCorrectionLevel:"H"});
 pdf.setDrawColor(8,90,48);pdf.setLineWidth(0.65);
 pdf.roundedRect(sx(1085),sy(772),sx(168),sy(160),2,2,"S");
 pdf.addImage(qr,"PNG",sx(1095),sy(781),sx(149),sy(141));
}

export async function downloadCourseCertificatePDF(c:CourseCertificate,kind:CertificateKind="course"){
 const [{jsPDF},QRCode]=await Promise.all([import("jspdf"),import("qrcode")]);
 const approvedTemplate=await loadApprovedCertificateTemplate();
 const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:approvedTemplate?[297,220]:"a4"});
 if(approvedTemplate){
  await drawApprovedTemplate(pdf,approvedTemplate,c,QRCode,kind);
  pdf.setProperties({title:"Swastha Learning Clinic Course Completion - "+c.reference_code,subject:"Verified digital course completion"});
  pdf.save("Swastha-"+(kind==="assessment"?"Assessment":"Course")+"-Certificate-"+c.reference_code+".pdf");
  return;
 }
 const w=297,h=210;
 // Green polygonal design based on the uploaded landscape certificate artwork.
 pdf.setFillColor(255,255,255);pdf.rect(0,0,w,h,"F");
 function triangle(points:[number,number][],rgb:[number,number,number]){
  pdf.setFillColor(...rgb);
  pdf.triangle(points[0][0],points[0][1],points[1][0],points[1][1],points[2][0],points[2][1],"F");
 }
 triangle([[0,6],[0,90],[60,60]],[0,128,95]);
 triangle([[0,50],[0,132],[61,77]],[0,94,45]);
 triangle([[0,95],[0,197],[67,135]],[196,219,21]);
 triangle([[0,120],[0,183],[48,154]],[118,196,17]);
 triangle([[297,15],[297,96],[238,67]],[228,238,18]);
 triangle([[297,65],[297,160],[242,95]],[65,181,53]);
 triangle([[297,111],[297,196],[239,153]],[0,101,46]);
 triangle([[297,141],[297,177],[255,152]],[0,138,115]);
 pdf.setDrawColor(184,151,51);pdf.setLineWidth(.55);pdf.rect(7,6,w-14,h-12,"S");
 pdf.setDrawColor(216,195,131);pdf.setLineWidth(.24);pdf.rect(10,9,w-20,h-18,"S");

 // Original Swastha logo provided and approved for this certificate.
 const officialLogo=await new Promise<HTMLImageElement>((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error("Approved Swastha logo could not be loaded."));
  img.src="/certificate-assets/swastha-official-logo.jpg";
 });
 pdf.addImage(officialLogo,"JPEG",112,9,73,44);
 pdf.setTextColor(10,86,46);pdf.setFont("times","bold");pdf.setFontSize(29);
 pdf.text("CERTIFICATE OF COMPLETION",w/2,65,{align:"center"});
 pdf.setDrawColor(184,151,51);pdf.setLineWidth(.45);
 pdf.line(65,71,115,71);pdf.line(182,71,231,71);
 pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.setCharSpace(1.1);
 pdf.setTextColor(65,68,72);
 pdf.text("THIS DIGITAL CERTIFICATE IS PROUDLY PRESENTED TO",w/2,84,{align:"center"});
 pdf.setCharSpace(0);
 pdf.setFont("times","italic");pdf.setFontSize(25);pdf.setTextColor(10,110,70);
 const studentLines=pdf.splitTextToSize(c.student_name,145).slice(0,2) as string[];
 pdf.text(studentLines,w/2,103,{align:"center"});
 pdf.setFont("helvetica","normal");pdf.setFontSize(9);pdf.setTextColor(46,53,55);
 pdf.text("Student ID: "+c.student_code,w/2,114,{align:"center"});
 pdf.setFontSize(10);
 pdf.text(kind==="assessment"?"FOR SUCCESSFULLY COMPLETING THE ASSESSMENT":"FOR SUCCESSFULLY COMPLETING THE COURSE",w/2,122,{align:"center"});
 pdf.setFillColor(10,102,59);pdf.roundedRect(65,128,167,18,2,2,"F");
 pdf.setTextColor(255,255,255);pdf.setFont("times","bolditalic");pdf.setFontSize(18);
 const titleLines=pdf.splitTextToSize(c.course_title,153).slice(0,2) as string[];
 pdf.text(titleLines,w/2,titleLines.length===1?139:135,{align:"center"});
 pdf.setTextColor(42,53,48);pdf.setFont("helvetica","italic");pdf.setFontSize(8);
 pdf.text("Issued as a digitally verifiable completion certificate by Swastha Learning Clinic.",w/2,154,{align:"center"});

 pdf.setDrawColor(185,152,54);pdf.line(43,166,108,166);pdf.line(177,166,239,166);
 pdf.setTextColor(8,93,54);pdf.setFont("helvetica","bold");pdf.setFontSize(9);
 pdf.text("Programme Coordinator",75,173,{align:"center"});
 pdf.text("Director",208,173,{align:"center"});
 pdf.setTextColor(40,45,48);pdf.setFont("helvetica","normal");pdf.setFontSize(8);
 pdf.text(c.programme_coordinator,75,179,{align:"center"});
 pdf.text(c.approving_director,208,179,{align:"center"});
 pdf.setTextColor(10,86,46);pdf.setFont("helvetica","bold");pdf.setFontSize(8.1);
 pdf.text("Issue date:",28,192);
 pdf.setFont("helvetica","normal");pdf.text(new Date(c.issued_at).toLocaleDateString("en-GB",{timeZone:"Asia/Kolkata"}),48,192);
 pdf.setFont("helvetica","bold");pdf.text("Completed:",78,192);
 pdf.setFont("helvetica","normal");pdf.text(c.completion_date,98,192);
 pdf.setFont("helvetica","bold");pdf.text("Digital reference:",132,192);
 pdf.setFont("helvetica","normal");pdf.setFontSize(6.9);pdf.text(c.reference_code,158,192);
 const qr=await QRCode.toDataURL(courseCertificateVerificationUrl(c.reference_code),{width:320,margin:1,errorCorrectionLevel:"H"});
 pdf.setFillColor(255,255,255);pdf.roundedRect(255,162,32,32,2,2,"F");
 pdf.addImage(qr,"PNG",257,164,28,28);
 pdf.setTextColor(7,75,44);pdf.setFontSize(7);pdf.setFont("helvetica","bold");
 pdf.text("SCAN TO VERIFY",271,198,{align:"center"});
 pdf.setTextColor(90,99,97);pdf.setFont("helvetica","normal");pdf.setFontSize(6);
 pdf.text("Issued electronically; no handwritten signature required.",w/2,203,{align:"center"});
 pdf.setProperties({title:"Swastha Learning Clinic Course Completion - "+c.reference_code,subject:"Verified course completion"});
 pdf.save("Swastha-"+(kind==="assessment"?"Assessment":"Course")+"-Certificate-"+c.reference_code+".pdf");
}

/** Assessment certificates are issued only from teacher-reviewed standard assessments by the server RPC. */
export async function downloadAssessmentCertificatePDF(c:AssessmentCertificate){
 return downloadCourseCertificatePDF({
  id:c.id,registration_id:c.assignment_id,student_id:c.student_id,
  student_name:c.student_name,student_code:c.student_code,
  course_title:c.assessment_title,completion_date:c.completion_date,
  reference_code:c.reference_code,issued_at:c.issued_at,
  programme_coordinator:c.programme_coordinator,approving_director:c.approving_director
 },"assessment");
}
