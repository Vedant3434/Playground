#include <bits/stdc++.h>
using namespace std;

struct College {string name; 
                string city; 
                int establishmentYear; 
                float passPercentage; };

bool compare(College a, College b)
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
  cout<<"Enter the number of colleges"<<endl;
  cin>>n;
  College s[n];
  for(int i=0;i<n;i++)
  {
    cout<<"Enter the details of college "<<i+1<<endl;
    cout << "Enter name"<<endl;
    cin>>s[i].name;
    cout << "Enter city"<<endl;
    cin>>s[i].city;
    cout << "Enter year of establishment"<<endl;
    cin >> s[i].establishmentYear;
    cout << "Enter pass percentage"<<endl;
    cin >> s[i].passPercentage;
  }
  sort(s,s+n,compare);
  cout <<"Details of colleges"<< endl;
  for(int i=0;i<n;i++)
  {
    cout<<"College:"<<i+1<<endl;
    cout << "Name:"<<s[i].name<< endl;
    cout << "City:"<<s[i].city<< endl;
    cout <<"Year of establishment:"<<s[i].establishmentYear << endl;
    cout << "Pass percentage:" << ro(s[i].passPercentage)<<endl;
  }

    return 0;
}
