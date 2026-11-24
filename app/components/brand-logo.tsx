"use client";
import {useState} from "react";
export default function BrandLogo({footer=false}:{footer?:boolean}) {
 const [failed,setFailed]=useState(false);
 return failed
 ? <span style={{fontWeight:800,color:"#12345a",fontSize:footer?18:14}}>SWASTHA LEARNING CLINIC</span>
 : <img src="https://swasthalearning.com/swastha-learning-clinic-logo.png" alt="Swastha Learning Clinic — Solutions For All Learning Difficulties" onError={()=>setFailed(true)} width={footer?310:175} height={footer?188:106} style={{width:footer?"min(310px,100%)":"min(175px,100%)",height:"auto",display:"block",objectFit:"contain"}}/>;
}
