#include <bits/stdc++.h>
using namespace std;

struct Student {string name; 
                string department; 
                int yearOfStudy; 
                float cgpa; };

bool compare(Student a, Student b)
{
	return a.name<b.name;
}

float ro(float var)
{
	float value = (int)(var * 100 +.5); 
	return (float)value / 100; 
}

int main()
{
  int n;
  cout<<"Enter the number of students"<<endl;
  cin>>n;
  Student s[n];
  for(int i=0;i<n;i++)
  {
    cout<<"Enter the details of student "<<i+1<<endl;
    cout << "Enter name"<<endl;
    cin>>s[i].name;
    cout << "Enter department"<<endl;
    cin>>s[i].department;
    cout << "Enter year of study"<<endl;
    cin >> s[i].yearOfStudy;
    cout << "Enter cgpa"<<endl;
    cin >> s[i].cgpa;
  }
  sort(s,s+n,compare);
  cout <<"Details of students"<< endl;
  for(int i=0;i<n;i++)
  {
    cout<<"Student "<<i+1<<endl;
    cout << "Name:"<<s[i].name<< endl;
    cout << "Department:"<<s[i].department<< endl;
    cout <<"Year of study:"<<s[i].yearOfStudy << endl;
    cout << "CGPA:" << ro(s[i].cgpa)<<endl;
  }

    return 0;
}